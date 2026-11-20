"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties } from "react";

type S = {
  id: string; name: string; phone: string | null; isActive: boolean;
  commissionType: "PERCENT" | "FIXED"; commissionValue: number; notes: string | null;
  serviceIds: string[]; servicesCount: number; sales: number; earned: number; paid: number; due: number;
};
type Svc = { id: string; name: string; price: number };
type Form = { id?: string; name: string; phone: string; type: "PERCENT" | "FIXED"; value: string; notes: string; isActive: boolean; serviceIds: string[] };

const PINK = "#c2185b";
const fmt = (n: number) => n.toLocaleString("ar-EG", { maximumFractionDigits: 2 }) + " ج";
const uid = () => (typeof crypto !== "undefined" && crypto.randomUUID ? crypto.randomUUID() : String(Date.now()) + Math.random().toString(16).slice(2));

const inp: CSSProperties = { width: "100%", height: 44, border: "1px solid #f3c4d5", borderRadius: 12, padding: "0 12px", fontSize: 15, background: "#fff", boxSizing: "border-box", fontFamily: "inherit" };
const btn: CSSProperties = { height: 46, border: 0, borderRadius: 14, background: PINK, color: "#fff", fontWeight: 800, fontSize: 15, padding: "0 18px", fontFamily: "inherit" };
const btn2: CSSProperties = { ...btn, background: "#fff", color: PINK, border: "1px solid " + PINK };
const card: CSSProperties = { background: "#fff", border: "1px solid #f3c4d5", borderRadius: 16, padding: 14, marginBottom: 10 };
const lbl: CSSProperties = { fontSize: 13, fontWeight: 700, color: "#7a5a68", margin: "10px 0 4px", display: "block" };

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

export default function StaffPage() {
  const [list, setList] = useState<S[]>([]);
  const [svcs, setSvcs] = useState<Svc[]>([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [form, setForm] = useState<Form | null>(null);
  const [pay, setPay] = useState<S | null>(null);
  const [payAmt, setPayAmt] = useState("");
  const [payMethod, setPayMethod] = useState<"cash" | "vodafone_cash">("cash");
  const [payNote, setPayNote] = useState("");
  const [payKey, setPayKey] = useState(uid());
  const [busy, setBusy] = useState(false);

  const flash = (m: string) => { setMsg(m); setTimeout(() => setMsg(""), 3000); };

  const load = useCallback(async () => {
    const r = await call<S[]>("/api/admin/staff", "GET");
    if (r.ok && Array.isArray(r.data)) setList(r.data);
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
    call<{ services?: Svc[] }>("/api/admin/invoices/lookups", "GET").then((r) => {
      if (r.ok) setSvcs(r.data.services ?? []);
    });
  }, [load]);

  const openNew = () => setForm({ name: "", phone: "", type: "PERCENT", value: "", notes: "", isActive: true, serviceIds: [] });
  const openEdit = (s: S) =>
    setForm({ id: s.id, name: s.name, phone: s.phone || "", type: s.commissionType, value: String(s.commissionValue), notes: s.notes || "", isActive: s.isActive, serviceIds: s.serviceIds });

  const save = async () => {
    if (!form || busy) return;
    const v = Number(form.value || 0);
    if (!form.name.trim()) return flash("اكتبي الاسم");
    if (!(v >= 0)) return flash("قيمة العمولة غير صحيحة");
    if (form.type === "PERCENT" && v > 100) return flash("النسبة لا تزيد عن 100");
    setBusy(true);
    const body = { name: form.name.trim(), phone: form.phone.trim() || null, commissionType: form.type, commissionValue: v, notes: form.notes.trim() || null, isActive: form.isActive, serviceIds: form.serviceIds };
    const r = form.id ? await call<{ error?: string }>(`/api/admin/staff/${form.id}`, "PATCH", body) : await call<{ error?: string }>("/api/admin/staff", "POST", body);
    setBusy(false);
    if (!r.ok) return flash(r.data.error || "تعذر الحفظ");
    setForm(null);
    flash("تم الحفظ");
    load();
  };

  const openPay = (s: S) => { setPay(s); setPayAmt(s.due > 0 ? String(s.due) : ""); setPayMethod("cash"); setPayNote(""); setPayKey(uid()); };

  const doPay = async () => {
    if (!pay || busy) return;
    const a = Number(payAmt);
    if (!(a > 0)) return flash("اكتبي مبلغًا صحيحًا");
    if (a > pay.due) return flash("المبلغ أكبر من المستحق");
    setBusy(true);
    const r = await call<{ error?: string }>(`/api/admin/staff/${pay.id}/payouts`, "POST", { amount: a, method: payMethod, note: payNote.trim() || null }, payKey);
    setBusy(false);
    if (!r.ok) return flash(r.data.error || "تعذر الدفع");
    setPay(null);
    flash("تم تسجيل الدفع");
    load();
  };

  const toggleSvc = (id: string) =>
    setForm((f) => (f ? { ...f, serviceIds: f.serviceIds.includes(id) ? f.serviceIds.filter((x) => x !== id) : [...f.serviceIds, id] } : f));

  const totalDue = list.reduce((s, x) => s + x.due, 0);

  return (
    <div dir="rtl" style={{ padding: 16, maxWidth: 720, margin: "0 auto", fontFamily: "inherit" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
        <h1 style={{ fontSize: 22, margin: 0, color: PINK }}>الموظفات والعمولات</h1>
        <button style={btn} onClick={openNew}>+ موظفة</button>
      </div>

      <div style={{ ...card, background: "#fff0f6" }}>
        <div style={{ fontSize: 13, color: "#7a5a68" }}>إجمالي المستحقات للموظفات</div>
        <div style={{ fontSize: 24, fontWeight: 800, color: PINK }}>{fmt(totalDue)}</div>
      </div>

      {msg && <div style={{ ...card, background: "#fff3cd", borderColor: "#ffe08a", fontWeight: 700 }}>{msg}</div>}
      {loading && <div style={{ textAlign: "center", padding: 20 }}>جاري التحميل...</div>}
      {!loading && list.length === 0 && <div style={{ ...card, textAlign: "center" }}>لا توجد موظفات بعد. اضغطي «+ موظفة».</div>}

      {list.map((s) => (
        <div key={s.id} style={{ ...card, opacity: s.isActive ? 1 : 0.6 }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div>
              <div style={{ fontWeight: 800, fontSize: 17 }}>{s.name}{!s.isActive && " (متوقفة)"}</div>
              <div style={{ fontSize: 13, color: "#7a5a68" }}>
                {s.commissionType === "PERCENT" ? `${s.commissionValue}% من المبيعات` : `${fmt(s.commissionValue)} لكل خدمة`}
                {s.phone ? ` · ${s.phone}` : ""}
              </div>
            </div>
            <div style={{ textAlign: "left" }}>
              <div style={{ fontSize: 12, color: "#7a5a68" }}>المستحق</div>
              <div style={{ fontWeight: 800, color: s.due > 0 ? "#b54708" : "#1b7f4b" }}>{fmt(s.due)}</div>
            </div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 6, margin: "10px 0", fontSize: 12, textAlign: "center" }}>
            <div><div style={{ color: "#7a5a68" }}>بنود</div><b>{s.servicesCount}</b></div>
            <div><div style={{ color: "#7a5a68" }}>المبيعات</div><b>{fmt(s.sales)}</b></div>
            <div><div style={{ color: "#7a5a68" }}>العمولة</div><b>{fmt(s.earned)}</b></div>
            <div><div style={{ color: "#7a5a68" }}>المدفوع</div><b>{fmt(s.paid)}</b></div>
          </div>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn2, flex: 1 }} onClick={() => openEdit(s)}>تعديل</button>
            <button style={{ ...btn, flex: 1, opacity: s.due > 0 ? 1 : 0.4 }} disabled={s.due <= 0} onClick={() => openPay(s)}>دفع مستحق</button>
          </div>
        </div>
      ))}

      {form && (
        <Sheet onClose={() => setForm(null)}>
          <h2 style={{ margin: "0 0 8px", color: PINK }}>{form.id ? "تعديل موظفة" : "موظفة جديدة"}</h2>
          <label style={lbl}>الاسم</label>
          <input style={inp} value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          <label style={lbl}>الهاتف</label>
          <input style={inp} inputMode="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
          <label style={lbl}>نوع العمولة</label>
          <select style={inp} value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as "PERCENT" | "FIXED" })}>
            <option value="PERCENT">نسبة مئوية من قيمة الخدمة</option>
            <option value="FIXED">مبلغ ثابت لكل خدمة</option>
          </select>
          <label style={lbl}>{form.type === "PERCENT" ? "النسبة %" : "المبلغ (ج)"}</label>
          <input style={inp} inputMode="decimal" value={form.value} onChange={(e) => setForm({ ...form, value: e.target.value })} />
          <label style={lbl}>الخدمات التي تقدمها</label>
          <div style={{ maxHeight: 180, overflowY: "auto", border: "1px solid #f3c4d5", borderRadius: 12, background: "#fff", padding: 8 }}>
            {svcs.map((x) => (
              <label key={x.id} style={{ display: "flex", gap: 8, alignItems: "center", padding: "6px 4px", fontSize: 14 }}>
                <input type="checkbox" checked={form.serviceIds.includes(x.id)} onChange={() => toggleSvc(x.id)} />
                {x.name}
              </label>
            ))}
            {svcs.length === 0 && <div style={{ fontSize: 13, color: "#7a5a68" }}>لا توجد خدمات</div>}
          </div>
          <label style={lbl}>ملاحظات</label>
          <input style={inp} value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
          <label style={{ display: "flex", gap: 8, alignItems: "center", margin: "12px 0", fontWeight: 700 }}>
            <input type="checkbox" checked={form.isActive} onChange={(e) => setForm({ ...form, isActive: e.target.checked })} />
            نشطة
          </label>
          <div style={{ display: "flex", gap: 8 }}>
            <button style={{ ...btn, flex: 1 }} disabled={busy} onClick={save}>{busy ? "..." : "حفظ"}</button>
            <button style={{ ...btn2, flex: 1 }} onClick={() => setForm(null)}>إلغاء</button>
          </div>
        </Sheet>
      )}

      {pay && (
        <Sheet onClose={() => setPay(null)}>
          <h2 style={{ margin: "0 0 4px", color: PINK }}>دفع مستحق {pay.name}</h2>
          <div style={{ fontSize: 13, color: "#7a5a68" }}>المستحق الحالي: <b>{fmt(pay.due)}</b></div>
          <label style={lbl}>المبلغ</label>
          <input style={inp} inputMode="decimal" value={payAmt} onChange={(e) => setPayAmt(e.target.value)} />
          <label style={lbl}>الدفع من</label>
          <select style={inp} value={payMethod} onChange={(e) => setPayMethod(e.target.value as "cash" | "vodafone_cash")}>
            <option value="cash">نقدي</option>
            <option value="vodafone_cash">Vodafone Cash</option>
          </select>
          <label style={lbl}>ملاحظة</label>
          <input style={inp} value={payNote} onChange={(e) => setPayNote(e.target.value)} />
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            <button style={{ ...btn, flex: 1 }} disabled={busy} onClick={doPay}>{busy ? "..." : "تأكيد الدفع"}</button>
            <button style={{ ...btn2, flex: 1 }} onClick={() => setPay(null)}>إلغاء</button>
          </div>
        </Sheet>
      )}
    </div>
  );
}
