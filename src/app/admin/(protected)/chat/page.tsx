"use client";
import type { PresenceCh, PresenceMember, PusherMembers } from "@/lib/pusher-types";
import type { ErrLike } from "@/lib/err-like";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Pusher from "pusher-js";

type Conv = {
  id: string;
  customer: { id: string; name: string; phone: string };
  lastMessageAt: string | null;
  lastMessagePreview: string | null;
  adminUnread: number;
  customerLastSeenAt: string | null;
};
type Msg = {
  id: string;
  sender: string;
  kind: string;
  body: string | null;
  imageUrl: string | null;
  replyTo: { id: string; sender: string; body: string | null } | null;
  deliveredAt: string | null;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  pending?: boolean;
};
type Quick = { id: string; title: string; body: string };
type Catalog = {
  services: { id: string; name: string; durationMin: number }[];
  offers: { id: string; title: string; newPrice: number }[];
};

function merge(prev: Msg[], incoming: Msg[]): Msg[] {
  const map = new Map<string, Msg>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());
}
const fmtTime = (iso: string) => new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
const fmtShort = (iso: string) => {
  const d = new Date(iso);
  return d.toDateString() === new Date().toDateString()
    ? fmtTime(iso)
    : d.toLocaleDateString("ar-EG", { day: "numeric", month: "short" });
};
const fmtDay = (iso: string) => new Date(iso).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

function Ticks({ m }: { m: Msg }) {
  if (m.pending) return <span>🕓</span>;
  if (m.readAt) return <span className="text-sky-200">✓✓</span>;
  if (m.deliveredAt) return <span>✓✓</span>;
  return <span>✓</span>;
}

export default function AdminChatPage() {
  const [convs, setConvs] = useState<Conv[]>([]);
  const [totalUnread, setTotalUnread] = useState(0);
  const [q, setQ] = useState("");
  const [onlyUnread, setOnlyUnread] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [lastSeen, setLastSeen] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [custOnline, setCustOnline] = useState(false);
  const [custTyping, setCustTyping] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [quick, setQuick] = useState<Quick[]>([]);
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [menu, setMenu] = useState<"" | "services" | "offers" | "quick">("");
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [zoom, setZoom] = useState<string | null>(null);
  const [newQ, setNewQ] = useState({ title: "", body: "" });

  const bottomRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const channelRef = useRef<PresenceCh | null>(null);
  const lastTypingRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);
  const markedRef = useRef<string | null>(null);

  const sel = convs.find((c) => c.id === selId) || null;

  const loadList = useCallback(async () => {
    const sp = new URLSearchParams();
    if (q.trim()) sp.set("q", q.trim());
    if (onlyUnread) sp.set("unread", "1");
    const res = await fetch(`/api/admin/chat/conversations?${sp}`, { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    setConvs(d.conversations);
    setTotalUnread(d.totalUnread);
  }, [q, onlyUnread]);

  useEffect(() => {
    const t = setTimeout(loadList, 250);
    return () => clearTimeout(t);
  }, [loadList]);
  useEffect(() => {
    const id = setInterval(() => !document.hidden && loadList(), 8000);
    return () => clearInterval(id);
  }, [loadList]);

  useEffect(() => {
    fetch("/api/admin/chat/quick-replies").then(async (r) => {
      if (r.ok) setQuick(await r.json());
    });
    fetch("/api/admin/chat/catalog").then(async (r) => {
      if (r.ok) setCatalog(await r.json());
    });
  }, []);

  const fetchMsgs = useCallback(async (id: string) => {
    const res = await fetch(`/api/admin/chat/conversations/${id}/messages?limit=60`, { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    setMsgs((p) => merge(p, d.messages as Msg[]));
    setLastSeen(d.customerLastSeenAt);
  }, []);

  function openConv(id: string) {
    setSelId(id);
    setMsgs([]);
    setReplyTo(null);
    setSelected(null);
    setMenu("");
    setCustOnline(false);
    setCustTyping(false);
    stick.current = true;
    markedRef.current = null;
    fetchMsgs(id);
  }

  useEffect(() => {
    if (!selId) return;
    const id = setInterval(() => !document.hidden && fetchMsgs(selId), live ? 30000 : 5000);
    return () => clearInterval(id);
  }, [selId, live, fetchMsgs]);

  // Realtime for the open conversation.
  useEffect(() => {
    if (!selId) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;
    const p = new Pusher(key, { cluster, channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" } });
    const ch = p.subscribe(`presence-chat-${selId}`) as unknown as PresenceCh;
    channelRef.current = ch;
    let tt: ReturnType<typeof setTimeout> | undefined;
    const hasCustomer = () => {
      let on = false;
      ch.members?.each((m: PresenceMember) => {
        if (String(m.id).startsWith("c:")) on = true;
      });
      return on;
    };
    ch.bind("pusher:subscription_succeeded", () => {
      setLive(true);
      setCustOnline(hasCustomer());
    });
    ch.bind("pusher:subscription_error", () => setLive(false));
    ch.bind("pusher:member_added", (m: PresenceMember) => String(m.id).startsWith("c:") && setCustOnline(true));
    ch.bind("pusher:member_removed", () => setCustOnline(hasCustomer()));
    ch.bind("message", (m: Msg) => {
      if (m.sender === "CUSTOMER") setCustTyping(false);
      setMsgs((prev) => merge(prev, [m]));
    });
    ch.bind("deleted", (d: { id: string }) =>
      setMsgs((prev) => prev.map((x) => (x.id === d.id ? { ...x, deletedAt: new Date().toISOString(), body: null, imageUrl: null } : x)))
    );
    ch.bind("read", (d: { by: string; at: string }) => {
      if (d.by !== "CUSTOMER") return;
      setMsgs((prev) => prev.map((x) => (x.sender === "ADMIN" && !x.readAt ? { ...x, deliveredAt: x.deliveredAt || d.at, readAt: d.at } : x)));
    });
    ch.bind("client-typing", () => {
      setCustTyping(true);
      if (tt) clearTimeout(tt);
      tt = setTimeout(() => setCustTyping(false), 3000);
    });
    return () => {
      if (tt) clearTimeout(tt);
      channelRef.current = null;
      setLive(false);
      p.unsubscribe(`presence-chat-${selId}`);
      p.disconnect();
    };
  }, [selId]);

  // Mark customer messages as read once seen.
  useEffect(() => {
    if (!selId || document.hidden) return;
    const last = [...msgs].reverse().find((m) => m.sender === "CUSTOMER");
    if (last && markedRef.current !== last.id) {
      markedRef.current = last.id;
      fetch(`/api/admin/chat/conversations/${selId}/read`, { method: "POST" }).then(loadList).catch(() => {});
    }
  }, [msgs, selId, loadList]);

  useEffect(() => {
    if (stick.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, custTyping, selId]);
  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  async function post(payload: Record<string, unknown>, optimistic?: Msg) {
    if (!selId) return;
    stick.current = true;
    if (optimistic) setMsgs((p) => [...p, optimistic]);
    try {
      const res = await fetch(`/api/admin/chat/conversations/${selId}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذّر الإرسال");
      setMsgs((p) => merge(p.filter((m) => m.id !== optimistic?.id), [data.message as Msg]));
      loadList();
    } catch (e_) { const e = e_ as ErrLike;
      if (optimistic) setMsgs((p) => p.filter((m) => m.id !== optimistic.id));
      setError(e.message || "تعذّر الإرسال");
    }
  }

  function sendText(override?: string) {
    const t = (override ?? text).trim();
    if (!t) return;
    const quoted = replyTo;
    setText("");
    setReplyTo(null);
    setMenu("");
    post(
      { text: t, replyToId: quoted?.id },
      {
        id: `tmp-${Date.now()}`,
        sender: "ADMIN",
        kind: "TEXT",
        body: t,
        imageUrl: null,
        replyTo: quoted ? { id: quoted.id, sender: quoted.sender, body: (quoted.body || "").slice(0, 80) } : null,
        deliveredAt: null,
        readAt: null,
        deletedAt: null,
        createdAt: new Date().toISOString(),
        pending: true
      }
    );
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/admin/chat/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل رفع الصورة");
      await post({ imageUrl: data.url, text: text.trim() || undefined });
      setText("");
    } catch (err_) { const err = err_ as ErrLike;
      setError(err.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function removeMsg(m: Msg) {
    setSelected(null);
    const res = await fetch(`/api/admin/chat/messages/${m.id}`, { method: "DELETE" });
    if (res.ok) setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, deletedAt: new Date().toISOString(), body: null, imageUrl: null } : x)));
    else setError("تعذّر حذف الرسالة");
  }

  async function addQuick() {
    const res = await fetch("/api/admin/chat/quick-replies", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newQ)
    });
    const d = await res.json().catch(() => ({}));
    if (!res.ok) return setError(d.error || "تعذّر الحفظ");
    setQuick((p) => [...p, d]);
    setNewQ({ title: "", body: "" });
  }
  async function delQuick(id: string) {
    await fetch(`/api/admin/chat/quick-replies?id=${id}`, { method: "DELETE" });
    setQuick((p) => p.filter((x) => x.id !== id));
  }

  function onType(v: string) {
    setText(v);
    const now = Date.now();
    if (channelRef.current && now - lastTypingRef.current > 2000) {
      lastTypingRef.current = now;
      try {
        channelRef.current.trigger("client-typing", {});
      } catch {}
    }
  }

  const onlineNow = (c: Conv) => !!c.customerLastSeenAt && Date.now() - new Date(c.customerLastSeenAt).getTime() < 90000;
  const status = useMemo(() => {
    if (custTyping) return "بتكتب...";
    if (custOnline || (lastSeen && Date.now() - new Date(lastSeen).getTime() < 90000)) return "متصلة الآن";
    return lastSeen ? `آخر ظهور ${fmtShort(lastSeen)}` : "";
  }, [custTyping, custOnline, lastSeen]);

  return (
    <div dir="rtl" className="flex h-[calc(100dvh-7rem)] min-h-[480px] overflow-hidden rounded-xl2 border border-rosegold/25 bg-white shadow-soft">
      {/* Conversations list */}
      <aside className={`${selId ? "hidden md:flex" : "flex"} w-full flex-col border-l border-rosegold/20 md:w-80 md:shrink-0`}>
        <div className="space-y-2 border-b border-rosegold/20 p-3">
          <div className="flex items-center justify-between">
            <h1 className="font-display text-lg font-extrabold text-charcoal">Zina Chat</h1>
            {totalUnread > 0 && <span className="rounded-full bg-wine px-2.5 py-0.5 text-xs font-bold text-white">{totalUnread} جديدة</span>}
          </div>
          <input className="input-field !py-2" placeholder="بحث بالاسم أو الموبايل..." value={q} onChange={(e) => setQ(e.target.value)} />
          <label className="flex items-center gap-2 text-xs font-semibold text-charcoal/70">
            <input type="checkbox" checked={onlyUnread} onChange={(e) => setOnlyUnread(e.target.checked)} />
            غير المقروءة فقط
          </label>
        </div>
        <div className="flex-1 overflow-y-auto">
          {convs.length === 0 && <p className="p-6 text-center text-sm text-charcoal/60">مفيش محادثات لسه.</p>}
          {convs.map((c) => (
            <button
              key={c.id}
              onClick={() => openConv(c.id)}
              className={`flex w-full items-center gap-3 border-b border-rosegold/10 px-3 py-3 text-right ${c.id === selId ? "bg-blush/40" : "hover:bg-cream"}`}
            >
              <div className="relative flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine font-bold text-white">
                {c.customer.name.trim().charAt(0) || "؟"}
                {onlineNow(c) && <span className="absolute bottom-0 left-0 h-3 w-3 rounded-full border-2 border-white bg-emerald-500" />}
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate font-bold text-charcoal">{c.customer.name}</span>
                  {c.lastMessageAt && <span className="shrink-0 text-[11px] text-charcoal/50">{fmtShort(c.lastMessageAt)}</span>}
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="truncate text-xs text-charcoal/60">{c.lastMessagePreview}</span>
                  {c.adminUnread > 0 && (
                    <span className="flex h-5 min-w-[20px] shrink-0 items-center justify-center rounded-full bg-wine px-1.5 text-[11px] font-bold text-white">{c.adminUnread}</span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>
      </aside>

      {/* Conversation */}
      <section className={`${selId ? "flex" : "hidden md:flex"} min-w-0 flex-1 flex-col bg-cream`}>
        {!sel ? (
          <div className="m-auto text-center text-charcoal/50">
            <div className="text-5xl">💬</div>
            <p className="mt-2 text-sm font-semibold">اختاري محادثة</p>
          </div>
        ) : (
          <>
            <header className="flex items-center gap-3 border-b border-rosegold/20 bg-white px-3 py-2.5">
              <button onClick={() => setSelId(null)} className="flex h-10 w-10 items-center justify-center text-xl text-wine md:hidden" aria-label="رجوع">
                →
              </button>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wine font-bold text-white">{sel.customer.name.trim().charAt(0) || "؟"}</div>
              <div className="min-w-0 flex-1">
                <div className="truncate font-bold text-charcoal">{sel.customer.name}</div>
                <div className={`text-xs ${status === "متصلة الآن" || status === "بتكتب..." ? "font-bold text-emerald-600" : "text-charcoal/60"}`}>{status}</div>
              </div>
              <a href={`tel:${sel.customer.phone}`} dir="ltr" className="rounded-full border border-wine/30 px-3 py-1.5 text-xs font-bold text-wine">
                {sel.customer.phone}
              </a>
            </header>

            <div
              className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3"
              onScroll={(e) => {
                const el = e.currentTarget;
                stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
              }}
              onClick={() => setSelected(null)}
            >
              {msgs.map((m, i) => {
                const mine = m.sender === "ADMIN";
                const prev = msgs[i - 1];
                const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
                const deleted = !!m.deletedAt;
                return (
                  <div key={m.id} className="flex flex-col">
                    {newDay && <div className="my-2 self-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-charcoal/60">{fmtDay(m.createdAt)}</div>}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        if (!deleted && !m.pending) setSelected(selected === m.id ? null : m.id);
                      }}
                      className={`max-w-[82%] rounded-2xl px-3 py-2 text-[15px] leading-6 shadow-sm ${
                        mine ? "self-start rounded-tr-md bg-wine text-white" : "self-end rounded-tl-md border border-rosegold/20 bg-white text-charcoal"
                      }`}
                    >
                      {m.replyTo && !deleted && (
                        <div className={`mb-1 rounded-lg border-r-4 px-2 py-1 text-xs ${mine ? "border-white/70 bg-white/15" : "border-wine bg-blush/40"}`}>
                          <div className="font-bold">{m.replyTo.sender === "ADMIN" ? "Zina Nails" : "العميلة"}</div>
                          <div className="truncate opacity-80">{m.replyTo.body ?? "🚫 رسالة محذوفة"}</div>
                        </div>
                      )}
                      {deleted ? (
                        <span className="text-sm italic opacity-70">🚫 تم حذف الرسالة</span>
                      ) : (
                        <>
                          {m.imageUrl && (
                            <img
                              src={m.imageUrl}
                              alt="صورة"
                              loading="lazy"
                              onClick={(e) => {
                                e.stopPropagation();
                                setZoom(m.imageUrl);
                              }}
                              className="mb-1 max-h-64 w-full rounded-lg object-cover"
                            />
                          )}
                          {m.body && <div className="whitespace-pre-wrap break-words">{m.body}</div>}
                        </>
                      )}
                      <div className={`mt-0.5 flex items-center gap-1 text-[10px] ${mine ? "text-white/75" : "text-charcoal/50"}`}>
                        <span>{fmtTime(m.createdAt)}</span>
                        {mine && !deleted && <Ticks m={m} />}
                      </div>
                    </div>
                    {selected === m.id && (
                      <div className={`mt-1 flex gap-2 text-xs font-bold ${mine ? "self-start" : "self-end"}`}>
                        <button
                          onClick={() => {
                            setReplyTo(m);
                            setSelected(null);
                          }}
                          className="rounded-full bg-white px-3 py-1.5 text-wine shadow-sm"
                        >
                          ↩ رد
                        </button>
                        {mine && (
                          <button onClick={() => removeMsg(m)} className="rounded-full bg-white px-3 py-1.5 text-red-600 shadow-sm">
                            🗑 حذف
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              {custTyping && <div className="self-end rounded-2xl bg-white px-3 py-2 text-sm text-charcoal/60 shadow-sm">بتكتب...</div>}
              <div ref={bottomRef} />
            </div>

            {/* Composer */}
            <div className="border-t border-rosegold/25 bg-white">
              {error && <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-700">{error}</div>}
              {replyTo && (
                <div className="flex items-center gap-2 border-b border-rosegold/15 bg-blush/30 px-4 py-2 text-xs">
                  <div className="min-w-0 flex-1 border-r-4 border-wine pr-2">
                    <div className="font-bold text-wine">{replyTo.sender === "ADMIN" ? "Zina Nails" : "العميلة"}</div>
                    <div className="truncate text-charcoal/70">{replyTo.body || "📷 صورة"}</div>
                  </div>
                  <button onClick={() => setReplyTo(null)} className="px-2 text-lg text-charcoal/60">✕</button>
                </div>
              )}

              {menu === "quick" && (
                <div className="max-h-56 space-y-2 overflow-y-auto border-b border-rosegold/15 p-3">
                  {quick.map((r) => (
                    <div key={r.id} className="flex items-center gap-2">
                      <button onClick={() => sendText(r.body)} className="min-w-0 flex-1 rounded-xl bg-blush/40 px-3 py-2 text-right text-sm">
                        <div className="font-bold text-wine">{r.title}</div>
                        <div className="truncate text-xs text-charcoal/70">{r.body}</div>
                      </button>
                      <button onClick={() => delQuick(r.id)} className="px-2 text-red-500" aria-label="حذف">🗑</button>
                    </div>
                  ))}
                  <div className="space-y-1.5 border-t border-rosegold/15 pt-2">
                    <input className="input-field !py-2" placeholder="عنوان الرد" value={newQ.title} onChange={(e) => setNewQ({ ...newQ, title: e.target.value })} />
                    <textarea className="input-field !py-2" rows={2} placeholder="نص الرد" value={newQ.body} onChange={(e) => setNewQ({ ...newQ, body: e.target.value })} />
                    <button onClick={addQuick} disabled={!newQ.title.trim() || !newQ.body.trim()} className="btn-secondary !py-2 w-full disabled:opacity-40">
                      + إضافة رد سريع
                    </button>
                  </div>
                </div>
              )}
              {menu === "services" && (
                <div className="max-h-48 space-y-1.5 overflow-y-auto border-b border-rosegold/15 p-3">
                  {catalog?.services.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => {
                        setMenu("");
                        post({ serviceId: s.id });
                      }}
                      className="flex w-full justify-between rounded-xl bg-blush/40 px-3 py-2 text-sm"
                    >
                      <span className="font-bold">💅🏻 {s.name}</span>
                      <span className="text-xs text-charcoal/60">{s.durationMin} د</span>
                    </button>
                  ))}
                  {!catalog?.services.length && <p className="text-xs text-charcoal/60">مفيش خدمات.</p>}
                </div>
              )}
              {menu === "offers" && (
                <div className="max-h-48 space-y-1.5 overflow-y-auto border-b border-rosegold/15 p-3">
                  {catalog?.offers.map((o) => (
                    <button
                      key={o.id}
                      onClick={() => {
                        setMenu("");
                        post({ offerId: o.id });
                      }}
                      className="flex w-full justify-between rounded-xl bg-blush/40 px-3 py-2 text-sm"
                    >
                      <span className="font-bold">🎁 {o.title}</span>
                      <span className="text-xs text-charcoal/60">{o.newPrice} جنيه</span>
                    </button>
                  ))}
                  {!catalog?.offers.length && <p className="text-xs text-charcoal/60">مفيش عروض شغالة (عروض صفحة "العروض" بس).</p>}
                </div>
              )}

              <div className="flex gap-1.5 overflow-x-auto px-2 pt-2 text-xs font-bold">
                {([["quick", "⚡ ردود سريعة"], ["services", "💅🏻 خدمة"], ["offers", "🎁 عرض"]] as const).map(([k, label]) => (
                  <button
                    key={k}
                    onClick={() => setMenu(menu === k ? "" : k)}
                    className={`shrink-0 rounded-full border px-3 py-1.5 ${menu === k ? "border-wine bg-wine text-white" : "border-wine/30 text-wine"}`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              <div className="flex items-end gap-1.5 px-2 py-2">
                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickFile} />
                <button onClick={() => fileRef.current?.click()} disabled={uploading} aria-label="إرفاق صورة" className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl disabled:opacity-40">
                  {uploading ? "…" : "📎"}
                </button>
                <textarea
                  rows={1}
                  value={text}
                  maxLength={2000}
                  placeholder="اكتبي رد..."
                  onChange={(e) => {
                    onType(e.target.value);
                    e.target.style.height = "auto";
                    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                  }}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) {
                      e.preventDefault();
                      sendText();
                    }
                  }}
                  className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-3xl border border-charcoal/15 bg-white px-4 py-2.5 text-[15px] focus:border-wine focus:outline-none"
                />
                <button
                  onClick={() => sendText()}
                  disabled={!text.trim()}
                  aria-label="إرسال"
                  className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-wine text-xl text-white disabled:opacity-40"
                  style={{ transform: "scaleX(-1)" }}
                >
                  ➤
                </button>
              </div>
            </div>
          </>
        )}
      </section>

      {zoom && (
        <div onClick={() => setZoom(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4">
          <img src={zoom} alt="صورة" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
