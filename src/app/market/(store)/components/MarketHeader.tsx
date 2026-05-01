"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ShoppingCart } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useCart } from "@/components/cart/CartProvider";

const NOVA_BLUE = "#071A3A";
const NOVA_AQUA = "#2FF0D6";

const searchInputClass =
  "w-full rounded-full px-4 py-2.5 pr-24 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 shadow-sm";

export default function MarketHeader() {
  const router = useRouter();
  const sp = useSearchParams();
  const { count } = useCart();

  const initialQ = useMemo(() => sp.get("q") || "", [sp]);
  const [q, setQ] = useState("");

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  function goSearch() {
    const value = q.trim();
    const url = value ? `/market?q=${encodeURIComponent(value)}` : "/market";
    router.push(url);
  }

  return (
    <header
      className="w-full border-b"
      style={{
        backgroundColor: NOVA_BLUE,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-12 items-center gap-4">
        <div className="col-span-12 md:col-span-3 flex items-center justify-between md:block">
          <div>
            <Link
              href="/market"
              className="text-2xl font-black tracking-tight"
              style={{ color: NOVA_AQUA }}
            >
              NOVA
            </Link>
            <div className="text-xs" style={{ color: "rgba(47,240,214,0.75)" }}>
              Marketplace
            </div>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => router.push("/market/cart")}
              className="relative inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: NOVA_AQUA }} />
              {count > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: NOVA_AQUA, color: NOVA_BLUE }}
                >
                  {count}
                </span>
              )}
            </button>

            <Link href="/login" className="text-sm font-semibold" style={{ color: NOVA_AQUA }}>
              Iniciar sesión
            </Link>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goSearch();
              }}
              placeholder="Buscar productos, marcas o categorías…"
              className={searchInputClass}
            />

            <button
              onClick={goSearch}
              className="absolute right-1 top-1 bottom-1 px-4 rounded-full text-sm font-bold transition"
              style={{
                backgroundColor: NOVA_AQUA,
                color: NOVA_BLUE,
              }}
            >
              Buscar
            </button>
          </div>

          <div className="text-[11px] mt-1" style={{ color: "rgba(255,255,255,0.65)" }}>
            Tip: escribe y presiona Enter.
          </div>
        </div>

        <div className="hidden md:flex col-span-3 items-center justify-end gap-4">
          <button
            onClick={() => router.push("/market/cart")}
            className="relative inline-flex items-center gap-2 text-sm font-semibold transition"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            <ShoppingCart className="w-5 h-5" style={{ color: NOVA_AQUA }} />
            <span className="hidden lg:inline">Carrito</span>
            {count > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: NOVA_AQUA, color: NOVA_BLUE }}
              >
                {count}
              </span>
            )}
          </button>

          <Link href="/login" className="text-sm font-semibold transition" style={{ color: NOVA_AQUA }}>
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}