"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import Pusher from "pusher-js";
import PushToggle from "@/components/site/PushToggle";

type Msg = {
  id: string;
  sender: string;
  kind: string;
  body: string | null;
  imageUrl: string | null;
  serviceId: string | null;
  bookingId: string | null;
  replyTo: { id: string; sender: string; body: string | null } | null;
  deliveredAt: string | null;
  readAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  pending?: boolean;
};

const EMOJIS = ["😊", "😍", "🥰", "😘", "💅🏻", "💗", "💕", "✨", "🌸", "🎀", "👏", "🙏", "😂", "😅", "😉", "👍", "❤️", "🔥", "💖", "🤍", "😭", "🥹", "🙈", "💋"];

function merge(prev: Msg[], incoming: Msg[]): Msg[] {
  const map = new Map<string, Msg>();
  for (const m of prev) map.set(m.id, m);
  for (const m of incoming) map.set(m.id, m);
  return Array.from(map.values()).sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
  );
}

const fmtTime = (iso: string) =>
  new Date(iso).toLocaleTimeString("ar-EG", { hour: "numeric", minute: "2-digit" });
const fmtDay = (iso: string) =>
  new Date(iso).toLocaleDateString("ar-EG", { weekday: "long", day: "numeric", month: "long" });

function Ticks({ m }: { m: Msg }) {
  if (m.pending) return <span>🕓</span>;
  if (m.readAt) return <span className="text-sky-200">✓✓</span>;
  if (m.deliveredAt) return <span>✓✓</span>;
  return <span>✓</span>;
}

export default function ChatPage() {
  const [state, setState] = useState<"loading" | "anon" | "ok">("loading");
  const [msgs, setMsgs] = useState<Msg[]>([]);
  const [convId, setConvId] = useState<string | null>(null);
  const [live, setLive] = useState(false);
  const [adminOnline, setAdminOnline] = useState(false);
  const [adminTyping, setAdminTyping] = useState(false);
  const [text, setText] = useState("");
  const [replyTo, setReplyTo] = useState<Msg | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [searchOpen, setSearchOpen] = useState(false);
  const [q, setQ] = useState("");
  const [emojiOpen, setEmojiOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const [hasMore, setHasMore] = useState(false);
  const [zoom, setZoom] = useState<string | null>(null);
  const [vh, setVh] = useState<number | null>(null);
  const [vTop, setVTop] = useState(0);

  const bottomRef = useRef<HTMLDivElement>(null);
  const stick = useRef(true);
  const markedRef = useRef<string | null>(null);
  const channelRef = useRef<any>(null);
  const lastTypingRef = useRef(0);
  const fileRef = useRef<HTMLInputElement>(null);

  // Keep the layout above the on-screen keyboard.
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const f = () => {
      setVh(vv.height);
      setVTop(vv.offsetTop);
    };
    f();
    vv.addEventListener("resize", f);
    vv.addEventListener("scroll", f);
    return () => {
      vv.removeEventListener("resize", f);
      vv.removeEventListener("scroll", f);
    };
  }, []);

  const fetchLatest = useCallback(async () => {
    const res = await fetch("/api/chat/messages?limit=50", { cache: "no-store" });
    if (res.status === 401) {
      setState("anon");
      return;
    }
    if (!res.ok) return;
    const d = await res.json();
    setConvId(d.conversationId);
    setMsgs((p) => merge(p, d.messages as Msg[]));
    setHasMore((h) => h || d.messages.length >= 50);
    setState("ok");
  }, []);

  useEffect(() => {
    fetchLatest();
  }, [fetchLatest]);

  // Polling: fast when realtime is off, slow safety-net when it's on.
  useEffect(() => {
    if (state !== "ok") return;
    const id = setInterval(() => {
      if (!document.hidden) fetchLatest();
    }, live ? 30000 : 5000);
    return () => clearInterval(id);
  }, [state, live, fetchLatest]);

  // Realtime (Pusher presence channel).
  useEffect(() => {
    if (!convId) return;
    const key = process.env.NEXT_PUBLIC_PUSHER_KEY;
    const cluster = process.env.NEXT_PUBLIC_PUSHER_CLUSTER;
    if (!key || !cluster) return;

    const p = new Pusher(key, {
      cluster,
      channelAuthorization: { endpoint: "/api/pusher/auth", transport: "ajax" }
    });
    const ch: any = p.subscribe(`presence-chat-${convId}`);
    channelRef.current = ch;
    let typingTimer: ReturnType<typeof setTimeout> | undefined;

    ch.bind("pusher:subscription_succeeded", (members: any) => {
      setLive(true);
      let on = false;
      members.each((mem: any) => {
        if (String(mem.id).startsWith("a:")) on = true;
      });
      setAdminOnline(on);
    });
    ch.bind("pusher:subscription_error", () => setLive(false));
    ch.bind("pusher:member_added", (mem: any) => {
      if (String(mem.id).startsWith("a:")) setAdminOnline(true);
    });
    ch.bind("pusher:member_removed", () => {
      let on = false;
      ch.members?.each((mem: any) => {
        if (String(mem.id).startsWith("a:")) on = true;
      });
      setAdminOnline(on);
    });
    ch.bind("message", (m: Msg) => {
      if (m.sender === "CUSTOMER") return;
      setAdminTyping(false);
      setMsgs((prev) => merge(prev, [m]));
    });
    ch.bind("deleted", (d: { id: string }) => {
      setMsgs((prev) =>
        prev.map((x) => (x.id === d.id ? { ...x, deletedAt: new Date().toISOString(), body: null, imageUrl: null } : x))
      );
    });
    ch.bind("read", (d: { by: string; at: string }) => {
      if (d.by !== "ADMIN") return;
      setMsgs((prev) =>
        prev.map((x) => (x.sender === "CUSTOMER" && !x.readAt ? { ...x, deliveredAt: x.deliveredAt || d.at, readAt: d.at } : x))
      );
    });
    ch.bind("client-typing", () => {
      setAdminTyping(true);
      if (typingTimer) clearTimeout(typingTimer);
      typingTimer = setTimeout(() => setAdminTyping(false), 3000);
    });

    return () => {
      if (typingTimer) clearTimeout(typingTimer);
      channelRef.current = null;
      setLive(false);
      p.unsubscribe(`presence-chat-${convId}`);
      p.disconnect();
    };
  }, [convId]);

  // Mark admin messages as read once seen.
  useEffect(() => {
    if (state !== "ok" || document.hidden) return;
    const last = [...msgs].reverse().find((m) => m.sender === "ADMIN" && !m.pending);
    if (last && markedRef.current !== last.id) {
      markedRef.current = last.id;
      fetch("/api/chat/read", { method: "POST" }).catch(() => {});
    }
  }, [msgs, state]);

  useEffect(() => {
    if (stick.current) bottomRef.current?.scrollIntoView({ block: "end" });
  }, [msgs.length, adminTyping, state, vh]);

  useEffect(() => {
    if (!error) return;
    const t = setTimeout(() => setError(""), 4000);
    return () => clearTimeout(t);
  }, [error]);

  async function loadOlder() {
    const first = msgs.find((m) => !m.pending);
    if (!first) return;
    stick.current = false;
    const res = await fetch(`/api/chat/messages?before=${encodeURIComponent(first.createdAt)}&limit=50`, { cache: "no-store" });
    if (!res.ok) return;
    const d = await res.json();
    setMsgs((p) => merge(p, d.messages as Msg[]));
    setHasMore(d.messages.length >= 50);
  }

  async function send(imageUrl?: string) {
    const t = text.trim();
    if (!t && !imageUrl) return;
    const quoted = replyTo;
    const tmpId = `tmp-${Date.now()}`;
    const tmp: Msg = {
      id: tmpId,
      sender: "CUSTOMER",
      kind: imageUrl ? "IMAGE" : "TEXT",
      body: t || null,
      imageUrl: imageUrl || null,
      serviceId: null,
      bookingId: null,
      replyTo: quoted ? { id: quoted.id, sender: quoted.sender, body: (quoted.body || "").slice(0, 80) } : null,
      deliveredAt: null,
      readAt: null,
      deletedAt: null,
      createdAt: new Date().toISOString(),
      pending: true
    };
    stick.current = true;
    setMsgs((p) => [...p, tmp]);
    setText("");
    setReplyTo(null);
    setEmojiOpen(false);
    try {
      const res = await fetch("/api/chat/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text: t || undefined, imageUrl, replyToId: quoted?.id })
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "تعذّر الإرسال");
      setMsgs((p) => merge(p.filter((m) => m.id !== tmpId), [data.message as Msg]));
    } catch (e: any) {
      setMsgs((p) => p.filter((m) => m.id !== tmpId));
      setText(t);
      setError(e.message || "تعذّر الإرسال، حاولي تاني.");
    }
  }

  async function onPickFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append("file", file);
      const res = await fetch("/api/chat/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "فشل رفع الصورة");
      await send(data.url);
    } catch (err: any) {
      setError(err.message || "فشل رفع الصورة");
    } finally {
      setUploading(false);
    }
  }

  async function remove(m: Msg) {
    setSelected(null);
    const res = await fetch(`/api/chat/messages/${m.id}`, { method: "DELETE" });
    if (res.ok) {
      setMsgs((p) => p.map((x) => (x.id === m.id ? { ...x, deletedAt: new Date().toISOString(), body: null, imageUrl: null } : x)));
    } else {
      setError("تعذّر حذف الرسالة");
    }
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

  const shown = useMemo(() => {
    const term = q.trim();
    return searchOpen && term ? msgs.filter((m) => m.body && m.body.includes(term)) : msgs;
  }, [msgs, q, searchOpen]);

  const subtitle = adminTyping ? "بتكتب..." : adminOnline ? "متصل الآن" : "بنرد عليكي في أقرب وقت";

  return (
    <div
      dir="rtl"
      className="fixed inset-x-0 z-[60] flex flex-col bg-cream"
      style={{ height: vh ?? "100dvh", top: vTop }}
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          zIndex: -1,
          backgroundImage: "url('/logo-watermark.png')",
          backgroundRepeat: "repeat",
          backgroundSize: "200px auto",
          opacity: 0.1
        }}
      />
      {/* Header */}
      <header
        className="flex items-center gap-3 border-b border-rosegold/25 bg-white/90 px-3 py-2.5 backdrop-blur"
        style={{ paddingTop: "calc(0.625rem + env(safe-area-inset-top, 0px))" }}
      >
        <Link href="/" aria-label="رجوع" className="flex h-10 w-10 items-center justify-center rounded-full text-xl text-wine">
          →
        </Link>
        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-wine font-display text-lg font-extrabold text-cream">
          Z
        </div>
        <div className="min-w-0 flex-1">
          <div className="font-display font-extrabold text-charcoal">Zina Nails</div>
          <div className={`text-xs ${adminOnline || adminTyping ? "font-bold text-emerald-600" : "text-charcoal/60"}`}>{subtitle}</div>
        </div>
        <button
          aria-label="بحث"
          onClick={() => {
            setSearchOpen((v) => !v);
            setQ("");
          }}
          className="flex h-10 w-10 items-center justify-center rounded-full text-lg text-wine"
        >
          🔍
        </button>
      </header>

      {state === "ok" && <PushToggle compact />}

      {searchOpen && (
        <div className="border-b border-rosegold/20 bg-white px-3 py-2">
          <input
            autoFocus
            className="input-field !py-2"
            placeholder="ابحثي في الرسائل..."
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
      )}

      {/* Body */}
      {state === "loading" && <div className="flex flex-1 items-center justify-center text-charcoal/60">جاري التحميل...</div>}

      {state === "anon" && (
        <div className="flex flex-1 flex-col items-center justify-center gap-4 px-8 text-center">
          <div className="text-5xl">💬</div>
          <p className="font-bold text-charcoal">سجّلي دخول عشان تتكلمي مع Zina Nails</p>
          <Link href="/account" className="btn-primary">
            تسجيل الدخول
          </Link>
        </div>
      )}

      {state === "ok" && (
        <>
          <div
            className="flex flex-1 flex-col gap-1.5 overflow-y-auto px-3 py-3"
            onScroll={(e) => {
              const el = e.currentTarget;
              stick.current = el.scrollHeight - el.scrollTop - el.clientHeight < 140;
            }}
            onClick={() => setSelected(null)}
          >
            {hasMore && !searchOpen && (
              <button onClick={loadOlder} className="mx-auto mb-2 rounded-full bg-white px-4 py-1.5 text-xs font-bold text-wine shadow-sm">
                رسائل أقدم
              </button>
            )}

            {msgs.length === 0 && (
              <div className="m-auto max-w-xs rounded-2xl bg-white p-5 text-center text-sm leading-7 text-charcoal shadow-sm">
                <div className="mb-1 font-display text-lg font-extrabold text-wine">أهلًا وسهلًا بيكي في Zina Nails 💅🏻</div>
                ابعتيلنا الخدمة واليوم المناسب ليكي وهنرد عليكي.
                <div className="mt-2 text-xs text-charcoal/70">
                  🕓 المواعيد من 4:00 مساءً حتى نهاية اليوم.
                  <br />
                  💗 المواعيد قبل 4:00 مساءً بالحجز المسبق فقط.
                </div>
              </div>
            )}

            {shown.map((m, i) => {
              const mine = m.sender === "CUSTOMER";
              const prev = shown[i - 1];
              const newDay = !prev || new Date(prev.createdAt).toDateString() !== new Date(m.createdAt).toDateString();
              const deleted = !!m.deletedAt;
              const isCard = m.kind === "SERVICE_CARD" || m.kind === "OFFER_CARD";
              return (
                <div key={m.id} className="flex flex-col">
                  {newDay && (
                    <div className="my-2 self-center rounded-full bg-white/80 px-3 py-1 text-[11px] font-semibold text-charcoal/60">
                      {fmtDay(m.createdAt)}
                    </div>
                  )}
                  <div
                    onClick={(e) => {
                      e.stopPropagation();
                      if (!deleted && !m.pending) setSelected(selected === m.id ? null : m.id);
                    }}
                    className={`max-w-[82%] rounded-2xl px-3 py-2 text-[15px] leading-6 shadow-sm ${
                      mine
                        ? "self-start rounded-tr-md bg-wine text-white"
                        : "self-end rounded-tl-md border border-rosegold/20 bg-white text-charcoal"
                    }`}
                  >
                    {m.replyTo && !deleted && (
                      <div className={`mb-1 rounded-lg border-r-4 px-2 py-1 text-xs ${mine ? "border-white/70 bg-white/15" : "border-wine bg-blush/40"}`}>
                        <div className="font-bold">{m.replyTo.sender === "CUSTOMER" ? "أنتِ" : "Zina Nails"}</div>
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
                        {isCard && (
                          <Link
                            href="/booking"
                            onClick={(e) => e.stopPropagation()}
                            className="mt-2 block rounded-full bg-wine px-4 py-2 text-center text-sm font-bold text-white"
                          >
                            احجزي الآن
                          </Link>
                        )}
                        {m.kind === "BOOKING_CARD" && (
                          <Link href="/account" onClick={(e) => e.stopPropagation()} className="mt-1 block text-xs font-bold underline">
                            📅 عرض حجوزاتي
                          </Link>
                        )}
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
                        <button onClick={() => remove(m)} className="rounded-full bg-white px-3 py-1.5 text-red-600 shadow-sm">
                          🗑 حذف
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}

            {adminTyping && <div className="self-end rounded-2xl bg-white px-3 py-2 text-sm text-charcoal/60 shadow-sm">بتكتب...</div>}
            <div ref={bottomRef} />
          </div>

          {/* Composer */}
          <div className="border-t border-rosegold/25 bg-white/95" style={{ paddingBottom: "env(safe-area-inset-bottom, 0px)" }}>
            {error && <div className="bg-red-50 px-4 py-2 text-xs font-bold text-red-700">{error}</div>}
            {replyTo && (
              <div className="flex items-center gap-2 border-b border-rosegold/15 bg-blush/30 px-4 py-2 text-xs">
                <div className="min-w-0 flex-1 border-r-4 border-wine pr-2">
                  <div className="font-bold text-wine">{replyTo.sender === "CUSTOMER" ? "أنتِ" : "Zina Nails"}</div>
                  <div className="truncate text-charcoal/70">{replyTo.body || "📷 صورة"}</div>
                </div>
                <button onClick={() => setReplyTo(null)} className="px-2 text-lg text-charcoal/60" aria-label="إلغاء الرد">
                  ✕
                </button>
              </div>
            )}
            {emojiOpen && (
              <div className="grid grid-cols-8 gap-1 border-b border-rosegold/15 px-3 py-2 text-2xl">
                {EMOJIS.map((em) => (
                  <button key={em} onClick={() => onType(text + em)} className="h-10">
                    {em}
                  </button>
                ))}
              </div>
            )}
            <div className="flex items-end gap-1.5 px-2 py-2">
              <button
                onClick={() => setEmojiOpen((v) => !v)}
                aria-label="إيموجي"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl"
              >
                😊
              </button>
              <textarea
                rows={1}
                value={text}
                maxLength={2000}
                placeholder="اكتبي رسالة..."
                onChange={(e) => {
                  onType(e.target.value);
                  e.target.style.height = "auto";
                  e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px";
                }}
                onFocus={() => {
                  setEmojiOpen(false);
                  stick.current = true;
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey && window.matchMedia("(pointer:fine)").matches) {
                    e.preventDefault();
                    send();
                  }
                }}
                className="max-h-[120px] min-h-[44px] flex-1 resize-none rounded-3xl border border-charcoal/15 bg-white px-4 py-2.5 text-[15px] focus:border-wine focus:outline-none"
              />
              <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickFile} />
              <button
                onClick={() => fileRef.current?.click()}
                disabled={uploading}
                aria-label="إرفاق صورة"
                className="flex h-11 w-11 shrink-0 items-center justify-center text-2xl disabled:opacity-40"
              >
                {uploading ? "…" : "📎"}
              </button>
              <button
                onClick={() => send()}
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

      {zoom && (
        <div onClick={() => setZoom(null)} className="fixed inset-0 z-[70] flex items-center justify-center bg-black/85 p-4">
          <img src={zoom} alt="صورة" className="max-h-full max-w-full rounded-lg object-contain" />
        </div>
      )}
    </div>
  );
}
