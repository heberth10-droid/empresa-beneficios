"use client";

import React, { createContext, useContext, useEffect, useMemo, useState } from "react";

export type CartItem = {
  id: string;
  name: string;
  price: number;
  image?: string | null;
  qty: number;
};

type CartContextType = {
  items: CartItem[];
  addItem: (item: Omit<CartItem, "qty">, qty?: number) => void;
  removeItem: (id: string) => void;
  setQty: (id: string, qty: number) => void;
  clear: () => void;
  count: number;
  subtotal: number;
};

const CartContext = createContext<CartContextType | null>(null);

const STORAGE_KEY = "nova_cart_v1";

function safeParse(json: string | null) {
  try {
    return json ? JSON.parse(json) : null;
  } catch {
    return null;
  }
}

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);

  useEffect(() => {
    const raw = typeof window !== "undefined" ? localStorage.getItem(STORAGE_KEY) : null;
    const parsed = safeParse(raw);
    if (Array.isArray(parsed)) {
      setItems(
        parsed
          .filter((x) => x && typeof x.id === "string")
          .map((x) => ({
            id: String(x.id),
            name: String(x.name ?? ""),
            price: Number(x.price ?? 0),
            image: x.image ? String(x.image) : null,
            qty: Math.max(1, Number(x.qty ?? 1)),
          }))
      );
    }
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
  }, [items]);

  const addItem: CartContextType["addItem"] = (item, qty = 1) => {
    const q = Math.max(1, Number(qty || 1));
    setItems((prev) => {
      const found = prev.find((p) => p.id === item.id);
      if (found) {
        return prev.map((p) => (p.id === item.id ? { ...p, qty: p.qty + q } : p));
      }
      return [...prev, { ...item, qty: q }];
    });
  };

  const removeItem: CartContextType["removeItem"] = (id) => {
    setItems((prev) => prev.filter((p) => p.id !== id));
  };

  const setQty: CartContextType["setQty"] = (id, qty) => {
    const q = Math.max(1, Number(qty || 1));
    setItems((prev) => prev.map((p) => (p.id === id ? { ...p, qty: q } : p)));
  };

  const clear = () => setItems([]);

  const count = useMemo(() => items.reduce((acc, it) => acc + it.qty, 0), [items]);
  const subtotal = useMemo(() => items.reduce((acc, it) => acc + it.price * it.qty, 0), [items]);

  const value: CartContextType = { items, addItem, removeItem, setQty, clear, count, subtotal };

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error("useCart must be used inside CartProvider");
  return ctx;
}