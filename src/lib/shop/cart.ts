"use client";

import { useSyncExternalStore } from "react";

export type CartItem = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  comparePrice: number | null;
  qty: number;
  max: number;
};

export type FreshProduct = {
  productId: string;
  slug: string;
  name: string;
  imageUrl: string | null;
  price: number;
  comparePrice: number | null;
  stock: number;
};

const KEY = "dodo_shop_cart_v1";
const EMPTY: CartItem[] = [];
let cache: CartItem[] | null = null;
const listeners = new Set<() => void>();

function valid(x: unknown): x is CartItem {
  const i = x as CartItem;
  return !!i && typeof i.productId === "string" && typeof i.price === "number" && typeof i.qty === "number" && i.qty > 0;
}

function read(): CartItem[] {
  if (cache) return cache;
  let list: CartItem[] = [];
  try {
    const raw = window.localStorage.getItem(KEY);
    const arr = raw ? JSON.parse(raw) : [];
    list = Array.isArray(arr) ? arr.filter(valid) : [];
  } catch {
    list = [];
  }
  cache = list;
  return list;
}

function write(items: CartItem[]) {
  cache = items;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(items));
  } catch {
    /* storage unavailable: cart lives in memory only */
  }
  listeners.forEach((l) => l());
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => {
    if (e.key === KEY || e.key === null) {
      cache = null;
      cb();
    }
  };
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function useCart(): CartItem[] {
  return useSyncExternalStore(subscribe, read, () => EMPTY);
}

export function getCart(): CartItem[] {
  return read();
}

export function addToCart(item: Omit<CartItem, "qty">, qty = 1): { ok: boolean; capped: boolean } {
  if (item.max <= 0) return { ok: false, capped: false };
  const list = read();
  const existing = list.find((i) => i.productId === item.productId);
  const wanted = (existing ? existing.qty : 0) + qty;
  const finalQty = Math.min(wanted, item.max);
  const capped = wanted > item.max;
  if (existing) {
    write(list.map((i) => (i.productId === item.productId ? { ...i, ...item, qty: finalQty } : i)));
  } else {
    write([...list, { ...item, qty: finalQty }]);
  }
  return { ok: true, capped };
}

export function setQty(productId: string, qty: number) {
  const list = read();
  if (qty <= 0) {
    write(list.filter((i) => i.productId !== productId));
    return;
  }
  write(list.map((i) => (i.productId === productId ? { ...i, qty: i.max > 0 ? Math.min(qty, i.max) : qty } : i)));
}

export function removeItem(productId: string) {
  write(read().filter((i) => i.productId !== productId));
}

export function clearCart() {
  write([]);
}

export function syncCart(fresh: FreshProduct[]): { changed: boolean; removed: string[] } {
  const byId: Record<string, FreshProduct> = {};
  for (const f of fresh) byId[f.productId] = f;
  const next: CartItem[] = [];
  const removed: string[] = [];
  let changed = false;
  for (const i of read()) {
    const f = byId[i.productId];
    if (!f) {
      removed.push(i.name);
      changed = true;
      continue;
    }
    const qty = f.stock > 0 ? Math.min(i.qty, f.stock) : i.qty;
    if (qty !== i.qty || f.price !== i.price || f.stock !== i.max) changed = true;
    next.push({
      productId: i.productId,
      slug: f.slug,
      name: f.name,
      imageUrl: f.imageUrl,
      price: f.price,
      comparePrice: f.comparePrice,
      qty,
      max: f.stock
    });
  }
  if (changed) write(next);
  return { changed, removed };
}

export function cartTotals(items: CartItem[], s: { deliveryFee: number; freeDeliveryOver: number } | null) {
  let subtotal = 0;
  let savings = 0;
  let count = 0;
  for (const i of items) {
    subtotal += i.price * i.qty;
    if (i.comparePrice && i.comparePrice > i.price) savings += (i.comparePrice - i.price) * i.qty;
    count += i.qty;
  }
  subtotal = Math.round(subtotal * 100) / 100;
  savings = Math.round(savings * 100) / 100;
  let delivery: number | null = null;
  if (s) {
    delivery = items.length === 0 ? 0 : s.freeDeliveryOver > 0 && subtotal >= s.freeDeliveryOver ? 0 : s.deliveryFee;
  }
  return { subtotal, savings, delivery, total: subtotal + (delivery ?? 0), count };
}
