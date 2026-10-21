"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type Inv = { id: string; invoiceNo: number; customerName: string | null; date: string; total: number; paid: number; remaining: number; status: string };
type Detail = {
  id: string; invoiceNo: number; date: string; subtotal: number; discount: number; total: number; paid: number; remaining: number;
  status: string; notes: string | null; cancelReason: string | null; customer: { name: string; phone: string } | null;
  items: { id: string; description: string; quantity: number; unitPrice: number; discount: number; lineTotal: number }[];
  payments: { id: string; method: string; amount: number; paidAt: string }[];
  refunds: { id: string; method: string; amount: number; reason: string; date: string }[];
};
type Svc = { id: string; name: string; price: number };
type Cust = { id: string; name: string; phone: string };
type Row = { key: number; serviceId: string; description: string; quantity: string; unitPrice: string; discount: string };

const ML: Record<string, string> = { cash: "نقدي", vodafone_cash: "Vodafone Cash" };
const SL: Record<string, string> = { ISSUED: "مستحقة", PARTIAL: "مدفوعة جزئيًا", PAID: "مدفوعة", CANCELLED: "ملغاة" };
const SC: Record<string, string> = { ISSUED: "#b54708", PARTIAL: "#b54708", PAID: "#1b7f4b", CANCELLED: "#7a5a68" };
const PINK = "#c2185b";
const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const fdate = (s: string) => new Date(s).toLocaleDateString("ar-EG", { timeZone: "Africa/Cairo", day: "numeric", month: "short", year: "numeric" });
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const inp: CSSProperties = { width: "100%", height: 44, border: "1px solid #f3c4d5", borderRadius: 12, padding: "0 12px", fontSize: 15, background: "#fff", boxSizing: "border-box", fontFamily: "inherit" };
const btn: CSSProperties = { height: 46, border: 0, borderRadius: 14, background: PINK, color: "#fff", fontWeight: 800, fontSize: 15, padding: "0 18px", fontFamily: "inherit" };
const btn2: CSSProperties = { ...btn, background: "#fff", color: PINK, border: "1px solid " + PINK };
const card: CSSProperties = { background: "#fff", border: "1px solid #f3c4d5", borderRadius: 16, padding: 14, marginBottom: 10 };

async function call<T>(path: string, method: string, body?: unknown, key?: string): Promise<{ ok: boolean; data: T }> {
  try {
    const headers: Record<string, string> = { "Content-Type": "application/json" };
    if (key) headers["Idempotency-Key"] = key;
    const r = await fetch(path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) });
    const j = await r.json().catch(() => ({}));
    return { ok: r.ok, data: j as T };
  } catch {
    return { ok: false, data: { error: "تعذر الاتصال" } as unknown as T };
  }
}

function Sheet({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div onClick={onClose} style={{ position: "fixed", inset: 0, background: "rgba(40,10,25,.5)", zIndex: 9998, display: "flex", alignItems: "flex-end", justifyContent: "center" }}>
      <div dir="rtl" onClick={(e) => e.stopPropagation()} style={{ background: "#fff8fb", width: "100%", maxWidth: 560, maxHeight: "92dvh", overflowY: "auto", borderRadius: "28px 28px 0 0", padding: "16px 18px calc(24px + env(safe-area-inset-bottom,0px))", boxSizing: "border-box" }}>
        {children}
      </div>
    </div>
  );
}

function NewInvoice({ onClose, onDone, flash }: { onClose: () => void; onDone: () => void; flash: (m: string) => void }) {
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [custs, setCusts] = useState<Cust[]>([]);
  const [customerId, setCustomerId] = useState("");
  const [rows, setRows] = useState<Row[]>([{ key: 1, serviceId: "", description: "", quantity: "1", unitPrice: "", discount: "0" }]);
  const [cash, setCash] = useState("");
  const [vf, setVf] = useState("");
  const [notes, setNotes] = useState("");
  const [key] = useState(uid);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    call<{ services?: Svc[]; customers?: Cust[] }>("/api/admin/invoices/lookups", "GET").then((r) => {
      if (r.ok) { setSvcs(r.data.services ?? []); setCusts(r.data.customers ?? []); }
    });
  }, []);

  const upd = (k: number, patch: Partial<Row>) => setRows((rs) => rs.map((r) => (r.key === k ? { ...r, ...patch } : r)));
  const lines = rows.map((r) => {
    const q = Math.max(1, parseInt(r.quantity) || 1);
    const u = Math.round((parseFloat(r.unitPrice) || 0) * 100);
    const d = Math.round((parseFloat(r.discount) || 0) * 100);
    return u * q - d;
  });
  const total = lines.reduce((a, b) => a + b, 0);
  const paid = Math.round((parseFloat(cash) || 0) * 100) + Math.round((parseFloat(vf) || 0) * 100);

  async function submit() {
    if (total <= 0) return flash("إجمالي الفاتورة لازم يكون أكبر من صفر");
    if (paid > total) return flash("المدفوع أكبر من الإجمالي");
    const payments: { method: string; amount: number }[] = [];
    if ((parseFloat(cash) || 0) > 0) payments.push({ method: "cash", amount: parseFloat(cash) });
    if ((parseFloat(vf) || 0) > 0) payments.push({ method: "vodafone_cash", amount: parseFloat(vf) });
    const items = rows.map((r) => ({
      serviceId: r.serviceId || null,
      description: r.description || undefined,
      quantity: parseInt(r.quantity) || 1,
      unitPrice: r.unitPrice === "" ? null : parseFloat(r.unitPrice),
      discount: parseFloat(r.discount) || 0,
    }));
    setBusy(true);
    const r = await call<{ error?: string }>("/api/admin/invoices", "POST", { customerId: customerId || null, notes: notes || null, items, payments }, key);
    setBusy(false);
    if (!r.ok) return flash(r.data.error === "invalid" ? "راجع البيانات" : r.data.error ?? "تعذر الحفظ");
    flash("تم إصدار الفاتورة");
    onDone();
  }

  return (
    <Sheet onClose={onClose}>
      <h2 style={{ margin: "0 0 12px", color: "#5a1535", fontSize: 20 }}>فاتورة جديدة</h2>
      <select style={inp} value={customerId} onChange={(e) => setCustomerId(e.target.value)}>
        <option value="">بدون عميل</option>
        {custs.map((c) => <option key={c.id} value={c.id}>{c.name} · {c.phone}</option>)}
      </select>
      {rows.map((r, i) => (
        <div key={r.key} style={{ ...card, marginTop: 10 }}>
          <select style={inp} value={r.serviceId} onChange={(e) => {
            const s = svcs.find((x) => x.id === e.target.value);
            upd(r.key, { serviceId: e.target.value, unitPrice: s ? String(s.price) : r.unitPrice });
          }}>
            <option value="">بند حر (اكتب الوصف)</option>
            {svcs.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </select>
          {!r.serviceId && <input style={{ ...inp, marginTop: 8 }} placeholder="وصف البند" value={r.description} onChange={(e) => upd(r.key, { description: e.target.value })} />}
          <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
            <input style={inp} type="number" inputMode="numeric" placeholder="الكمية" value={r.quantity} onChange={(e) => upd(r.key, { quantity: e.target.value })} />
            <input style={inp} type="number" inputMode="decimal" placeholder="السعر" value={r.unitPrice} onChange={(e) => upd(r.key, { unitPrice: e.target.value })} />
            <input style={inp} type="number" inputMode="decimal" placeholder="خصم" value={r.discount} onChange={(e) => upd(r.key, { discount: e.target.value })} />
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", marginTop: 8, fontSize: 13 }}>
            <b>{fmt(lines[i] / 100)}</b>
            {rows.length > 1 && <button type="button" style={{ border: 0, background: "none", color: "#b42318", fontFamily: "inherit" }} onClick={() => setRows((rs) => rs.filter((x) => x.key !== r.key))}>حذف البند</button>}
          </div>
        </div>
      ))}
      <button type="button" style={{ ...btn2, width: "100%", marginTop: 4 }} onClick={() => setRows((rs) => [...rs, { key: Math.max(...rs.map((x) => x.key)) + 1, serviceId: "", description: "", quantity: "1", unitPrice: "", discount: "0" }])}>+ إضافة بند</button>
      <div style={{ ...card, marginTop: 12 }}>
        <div style={{ fontWeight: 800, marginBottom: 8 }}>المدفوع الآن</div>
        <div style={{ display: "flex", gap: 8 }}>
          <input style={inp} type="number" inputMode="decimal" placeholder="نقدي" value={cash} onChange={(e) => setCash(e.target.value)} />
          <input style={inp} type="number" inputMode="decimal" placeholder="Vodafone Cash" value={vf} onChange={(e) => setVf(e.target.value)} />
        </div>
      </div>
      <input style={inp} placeholder="ملاحظات (اختياري)" value={notes} onChange={(e) => setNotes(e.target.value)} />
      <div style={{ display: "flex", justifyContent: "space-between", margin: "14px 2px", fontWeight: 800 }}>
        <span>الإجمالي {fmt(total / 100)}</span><span>المتبقي {fmt((total - paid) / 100)}</span>
      </div>
      <button type="button" disabled={busy} style={{ ...btn, width: "100%", opacity: busy ? 0.6 : 1 }} onClick={submit}>{busy ? "جاري الحفظ..." : "إصدار الفاتورة"}</button>
    </Sheet>
  );
}

function InvoiceDetail({ id, onClose, onChanged, flash }: { id: string; onClose: () => void; onChanged: () => void; flash: (m: string) => void }) {
  const [d, setD] = useState<Detail | null>(null);
  const [mode, setMode] = useState<"" | "pay" | "refund" | "cancel">("");
  const [method, setMethod] = useState("cash");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [key, setKey] = useState("");
  const [busy, setBusy] = useState(false);

  const reload = useCallback(async () => {
    const r = await call<Detail>(`/api/admin/invoices/${id}`, "GET");
    if (r.ok) setD(r.data);
  }, [id]);
  useEffect(() => { reload(); }, [reload]);

  function open(m: "pay" | "refund" | "cancel") {
    if (!d) return;
    const refunded = d.refunds.reduce((a, x) => a + x.amount, 0);
    setMode(m); setKey(uid()); setReason("");
    setAmount(m === "pay" ? String(d.remaining) : m === "refund" ? String(Math.max(0, Math.round((d.paid - refunded) * 100) / 100)) : "");
  }

  async function submit() {
    if (!d || !mode) return;
    if (!window.confirm("تأكيد العملية؟")) return;
    const path = mode === "pay" ? "payments" : mode === "refund" ? "refunds" : "cancel";
    const a = parseFloat(amount);
    const body = mode === "cancel" ? { reason } : mode === "pay" ? { method, amount: a } : { method, amount: a, reason };
    setBusy(true);
    const r = await call<{ error?: string }>(`/api/admin/invoices/${d.id}/${path}`, "POST", body, key);
    setBusy(false);
    if (!r.ok) return flash(r.data.error === "invalid" ? "راجع البيانات (السبب 3 حروف على الأقل)" : r.data.error ?? "تعذر التنفيذ");
    flash("تمت العملية");
    setMode("");
    await reload();
    onChanged();
  }

  if (!d) return <Sheet onClose={onClose}><div style={{ padding: 30, textAlign: "center" }}>جاري التحميل...</div></Sheet>;
  const cancelled = d.status === "CANCELLED";
  return (
    <Sheet onClose={onClose}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <h2 style={{ margin: 0, color: "#5a1535", fontSize: 20 }}>فاتورة #{d.invoiceNo}</h2>
        <span style={{ color: SC[d.status], fontWeight: 800 }}>{SL[d.status]}</span>
      </div>
      <div style={{ fontSize: 13, opacity: 0.7, margin: "4px 0 12px" }}>{fdate(d.date)}{d.customer ? ` · ${d.customer.name}` : ""}</div>
      <div style={card}>
        {d.items.map((i) => (
          <div key={i.id} style={{ display: "flex", justifyContent: "space-between", padding: "5px 0" }}>
            <span>{i.description} × {i.quantity}{i.discount > 0 ? ` (خصم ${i.discount})` : ""}</span><b>{fmt(i.lineTotal)}</b>
          </div>
        ))}
        <div style={{ borderTop: "1px solid #fbe3ec", marginTop: 6, paddingTop: 6, display: "flex", justifyContent: "space-between", fontWeight: 800 }}><span>الإجمالي</span><span>{fmt(d.total)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between" }}><span>المدفوع</span><span>{fmt(d.paid)}</span></div>
        <div style={{ display: "flex", justifyContent: "space-between", fontWeight: 800 }}><span>المتبقي</span><span>{fmt(d.remaining)}</span></div>
      </div>
      {d.payments.length > 0 && <div style={card}><b>التحصيلات</b>{d.payments.map((p) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{ML[p.method] ?? p.method} · {fdate(p.paidAt)}</span><span>{fmt(p.amount)}</span></div>)}</div>}
      {d.refunds.length > 0 && <div style={card}><b>المسترد</b>{d.refunds.map((p) => <div key={p.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0" }}><span>{ML[p.method] ?? p.method} · {p.reason}</span><span>{fmt(p.amount)}</span></div>)}</div>}
      {cancelled && <div style={card}>سبب الإلغاء: {d.cancelReason}</div>}
      {!mode && !cancelled && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {d.remaining > 0 && <button type="button" style={btn} onClick={() => open("pay")}>تحصيل</button>}
          {d.paid > 0 && <button type="button" style={btn2} onClick={() => open("refund")}>استرداد</button>}
          <button type="button" style={{ ...btn2, color: "#b42318", borderColor: "#b42318" }} onClick={() => open("cancel")}>إلغاء الفاتورة</button>
        </div>
      )}
      {mode && (
        <div style={card}>
          <b>{mode === "pay" ? "تحصيل" : mode === "refund" ? "استرداد" : "إلغاء الفاتورة"}</b>
          {mode !== "cancel" && (
            <div style={{ display: "flex", gap: 8, marginTop: 8 }}>
              <select style={inp} value={method} onChange={(e) => setMethod(e.target.value)}>
                <option value="cash">نقدي</option><option value="vodafone_cash">Vodafone Cash</option>
              </select>
              <input style={inp} type="number" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
          )}
          {mode !== "pay" && <input style={{ ...inp, marginTop: 8 }} placeholder="السبب (إلزامي)" value={reason} onChange={(e) => setReason(e.target.value)} />}
          <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
            <button type="button" disabled={busy} style={{ ...btn, flex: 1, opacity: busy ? 0.6 : 1 }} onClick={submit}>{busy ? "..." : "تأكيد"}</button>
            <button type="button" style={btn2} onClick={() => setMode("")}>رجوع</button>
          </div>
        </div>
      )}
    </Sheet>
  );
}

export default function InvoicesPage() {
  const [list, setList] = useState<Inv[] | null>(null);
  const [status, setStatus] = useState("");
  const [toast, setToast] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const [newOpen, setNewOpen] = useState(false);

  const flash = useCallback((m: string) => { setToast(m); setTimeout(() => setToast(""), 3500); }, []);
  const load = useCallback(async () => {
    const r = await call<{ invoices?: Inv[]; error?: string }>(`/api/admin/invoices${status ? `?status=${status}` : ""}`, "GET");
    if (r.ok) setList(r.data.invoices ?? []);
    else { setList([]); flash(r.data.error ?? "تعذر التحميل"); }
  }, [status, flash]);
  useEffect(() => { load(); }, [load]);

  return (
    <div dir="rtl" style={{ maxWidth: 560, margin: "0 auto", padding: "16px 16px 120px" }}>
      {toast && <div style={{ position: "fixed", top: 78, left: "50%", transform: "translateX(-50%)", zIndex: 10001, background: "#2b1a22", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 14, fontWeight: 700 }}>{toast}</div>}
      <h1 style={{ fontWeight: 800, fontSize: 24, color: "#5a1535", margin: "0 0 12px" }}>المبيعات والفواتير</h1>
      <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 8 }}>
        {[["", "الكل"], ["ISSUED", "مستحقة"], ["PARTIAL", "جزئي"], ["PAID", "مدفوعة"], ["CANCELLED", "ملغاة"]].map(([v, l]) => (
          <button key={v} type="button" onClick={() => setStatus(v)} style={{ ...(status === v ? btn : btn2), height: 38, whiteSpace: "nowrap", fontSize: 13 }}>{l}</button>
        ))}
      </div>
      {list === null ? <div style={{ padding: 30, textAlign: "center" }}>جاري التحميل...</div> : list.length === 0 ? <div style={{ padding: 30, textAlign: "center", opacity: 0.7 }}>لا توجد فواتير</div> : list.map((i) => (
        <div key={i.id} onClick={() => setDetailId(i.id)} style={{ ...card, cursor: "pointer" }}>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <b>#{i.invoiceNo}{i.customerName ? ` · ${i.customerName}` : ""}</b>
            <span style={{ color: SC[i.status], fontWeight: 800, fontSize: 13 }}>{SL[i.status]}</span>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4, opacity: 0.8 }}>
            <span>{fdate(i.date)}</span><span>{fmt(i.total)}{i.remaining > 0 && i.status !== "CANCELLED" ? ` · متبقي ${fmt(i.remaining)}` : ""}</span>
          </div>
        </div>
      ))}
      <button type="button" onClick={() => setNewOpen(true)} style={{ ...btn, position: "fixed", left: 16, bottom: "calc(20px + env(safe-area-inset-bottom,0px))", zIndex: 9000, borderRadius: 999, boxShadow: "0 12px 26px rgba(194,24,91,.4)" }}>+ فاتورة جديدة</button>
      {newOpen && <NewInvoice onClose={() => setNewOpen(false)} onDone={() => { setNewOpen(false); load(); }} flash={flash} />}
      {detailId && <InvoiceDetail id={detailId} onClose={() => setDetailId(null)} onChanged={load} flash={flash} />}
    </div>
  );
}
