import { useEffect, useState } from "react";

export type CartItem = {
  id: number;
  name: string;
  price: number;
  quantity: number;
  canteen_id: number;
};

const KEY = "tms_cart";

function read(): CartItem[] {
  if (typeof window === "undefined") return [];
  try {
    return JSON.parse(localStorage.getItem(KEY) || "[]");
  } catch {
    return [];
  }
}
function write(items: CartItem[]) {
  localStorage.setItem(KEY, JSON.stringify(items));
  window.dispatchEvent(new Event("cart:update"));
}

export const cart = {
  get: read,
  add(item: Omit<CartItem, "quantity">, qty = 1) {
    const items = read();
    const existing = items.find((i) => i.id === item.id);
    if (existing) existing.quantity += qty;
    else items.push({ ...item, quantity: qty });
    write(items);
  },
  update(id: number, qty: number) {
    let items = read();
    if (qty <= 0) items = items.filter((i) => i.id !== id);
    else items = items.map((i) => (i.id === id ? { ...i, quantity: qty } : i));
    write(items);
  },
  remove(id: number) {
    write(read().filter((i) => i.id !== id));
  },
  clear() {
    write([]);
  },
};

export function useCart() {
  const [items, setItems] = useState<CartItem[]>(() => read());
  useEffect(() => {
    const handler = () => setItems(read());
    window.addEventListener("cart:update", handler);
    window.addEventListener("storage", handler);
    return () => {
      window.removeEventListener("cart:update", handler);
      window.removeEventListener("storage", handler);
    };
  }, []);
  const count = items.reduce((s, i) => s + i.quantity, 0);
  const total = items.reduce((s, i) => s + i.quantity * i.price, 0);
  return { items, count, total };
}
