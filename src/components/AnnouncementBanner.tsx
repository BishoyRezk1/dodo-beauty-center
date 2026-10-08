"use client";
import { useState } from "react";
import { usePathname } from "next/navigation";

export default function AnnouncementBanner() {
  const pathname = usePathname();
  const [open, setOpen] = useState(true);
  if (!open || pathname?.startsWith("/admin") || pathname?.startsWith("/chat")) return null;

  return (
    <div
      dir="rtl"
      style={{
        position: "relative",
        background: "linear-gradient(135deg,#fff0f6,#ffe0ee)",
        borderBottom: "2px solid #f9a8d4",
        color: "#6b1d45",
        padding: "16px 44px 16px 16px",
        textAlign: "right",
        lineHeight: 1.9,
        fontSize: 15,
      }}
    >
      <button
        onClick={() => setOpen(false)}
        aria-label="إغلاق"
        style={{
          position: "absolute", top: 8, left: 12, background: "none",
          border: "none", fontSize: 22, cursor: "pointer", color: "#6b1d45",
        }}
      >
        ×
      </button>
      <div style={{ maxWidth: 720, margin: "0 auto" }}>
        <div style={{ fontWeight: 800, fontSize: 18 }}>
          أهلًا وسهلًا بيكم في Zina Nails 💅🏻✨
        </div>
        <div style={{ marginTop: 8 }}>
          <div>📢 <b>مواعيد العمل:</b></div>
          <div>🕓 يوميًا من الساعة 4:00 مساءً وحتى نهاية اليوم.</div>
          <div>💗 المواعيد قبل الساعة 4:00 مساءً متاحة بالحجز المسبق فقط.</div>
        </div>
        <div style={{ marginTop: 8 }}>
          <div>📅 <b>احجزي موعدك الآن عن طريق إرسال:</b></div>
          <div>• اسمك</div>
          <div>• الخدمة المطلوبة</div>
          <div>• اليوم والوقت المناسب</div>
          <div>وسنقوم بالرد لتأكيد الحجز 💕</div>
        </div>
        <div style={{ marginTop: 8, fontWeight: 700, color: "#be185d" }}>
          #ZinaNails &nbsp; #جمالك_تفاصيله_بتفرق
        </div>
      </div>
    </div>
  );
}
