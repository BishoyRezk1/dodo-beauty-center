"use client";

import { useCallback, useEffect, useState } from "react";
import ShopAdminTabs from "@/components/admin/ShopAdminTabs";

type Cat = { id: string; name: string; slug: string; sortOrder: number; isActive: boolean; _count: { products: number } };

function Row({ c, onChange }: { c: Cat; onChange: () => void }) {
  const [name, setName] = useState(c.name);
  const [sort, setSort] = useState(String(c.sortOrder));
  const [msg, setMsg] = useState("");

  async function call(method: "PATCH" | "DELETE", body?: Record<string, unknown>) {
    setMsg("");
    const r = await fetch(`/api/admin/shop/categories/${c.id}`, {
      method,
      headers: { "Content-Type": "application/json" },
      body: body ? JSON.stringify(body) : undefined
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      setMsg(d?.error || "تعذر تنفيذ العملية");
      return;
    }
    onChange();
  }

  return (
    <div className="card flex flex-col gap-3 p-4">
      <div className="flex flex-wrap items-center gap-2">
        <input className="input-field min-w-[160px] flex-1" value={name} onChange={(e) => setName(e.target.value)} />
        <input className="input-field w-24" type="number" min={0} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="الترتيب" />
      </div>
      <p className="text-xs text-charcoal/50">
        {c.slug} · {c._count.products} منتج {!c.isActive && "· مخفي"}
      </p>
      <div className="flex flex-wrap gap-2">
        <button type="button" className="btn-primary !py-2 text-xs" onClick={() => call("PATCH", { name, sortOrder: Number(sort) || 0 })}>
          حفظ
        </button>
        <button type="button" className="btn-secondary !py-2 text-xs" onClick={() => call("PATCH", { isActive: !c.isActive })}>
          {c.isActive ? "إخفاء" : "إظهار"}
        </button>
        <button
          type="button"
          className="rounded-full border-2 border-red-400 px-4 py-2 text-xs font-bold text-red-500"
          onClick={() => confirm("حذف التصنيف؟") && call("DELETE")}
        >
          حذف
        </button>
      </div>
      {msg && <p className="text-sm font-bold text-red-600">{msg}</p>}
    </div>
  );
}

export default function ShopCategoriesPage() {
  const [items, setItems] = useState<Cat[]>([]);
  const [error, setError] = useState("");
  const [name, setName] = useState("");
  const [sort, setSort] = useState("0");

  const load = useCallback(async () => {
    try {
      const r = await fetch("/api/admin/shop/categories", { cache: "no-store" });
      const d = await r.json();
      if (!r.ok) throw new Error(d.error || "تعذر التحميل");
      setItems(d.items);
      setError("");
    } catch (e) {
      setError((e as Error).message);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  async function add(e: React.FormEvent) {
    e.preventDefault();
    const r = await fetch("/api/admin/shop/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, sortOrder: Number(sort) || 0 })
    });
    const d = await r.json().catch(() => null);
    if (!r.ok) {
      setError(d?.error || "تحققي من البيانات");
      return;
    }
    setName("");
    setSort("0");
    load();
  }

  return (
    <div>
      <ShopAdminTabs />
      <form onSubmit={add} className="card mb-5 flex flex-wrap gap-2 p-4">
        <input className="input-field min-w-[160px] flex-1" placeholder="اسم تصنيف جديد" value={name} onChange={(e) => setName(e.target.value)} required />
        <input className="input-field w-24" type="number" min={0} value={sort} onChange={(e) => setSort(e.target.value)} aria-label="الترتيب" />
        <button type="submit" className="btn-primary !py-2 text-sm">
          + إضافة
        </button>
      </form>
      {error && <p className="mb-3 text-sm font-bold text-red-600">{error}</p>}
      <div className="flex flex-col gap-3">
        {items.map((c) => (
          <Row key={c.id + c.name + c.sortOrder + c.isActive} c={c} onChange={load} />
        ))}
      </div>
    </div>
  );
}
