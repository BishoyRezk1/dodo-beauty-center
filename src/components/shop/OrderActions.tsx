"use client";

import { useState } from "react";

export default function OrderActions({ href, text }: { href: string | null; text: string }) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.style.position = "fixed";
      ta.style.opacity = "0";
      document.body.appendChild(ta);
      ta.select();
      try {
        document.execCommand("copy");
        setCopied(true);
      } catch {
        /* ignore */
      }
      document.body.removeChild(ta);
    }
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="space-y-2">
      {href && (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="block min-h-[52px] rounded-xl bg-[#25D366] py-3.5 text-center text-lg font-bold text-white"
        >
          تأكيد الطلب عبر واتساب
        </a>
      )}
      <button
        type="button"
        onClick={copy}
        className="min-h-[48px] w-full rounded-xl border border-wine py-3 font-bold text-wine"
      >
        {copied ? "تم النسخ ✓" : "نسخ تفاصيل الطلب"}
      </button>
    </div>
  );
}
