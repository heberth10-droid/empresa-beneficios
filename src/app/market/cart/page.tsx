"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { Trash2 } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function CartPageContent() {
  const { items, subtotal, setQty, removeItem, clear } = useCart();

  if (items.length === 0) return (
    <div className="max-w-2xl mx-auto px-4 py-16 text-center space-y-5">
      <div className="w-20 h-20 rounded-full flex items-center justify-center mx-auto"
        style={{ backgroundColor: "var(--nomi-gray)", border: "1.5px solid var(--nomi-border)" }}>
        <span className="text-3xl">🛒</span>
      </div>
      <h1 className="text-2xl font-black" style={{ color: "var(--nomi-navy)" }}>Tu carrito esta vacio</h1>
      <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>Agrega productos del catalogo para continuar</p>
      <Link href="/market"
        className="inline-flex px-6 py-3 rounded-xl text-sm font-black cursor-pointer"
        style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
        Ver catalogo
      </Link>
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* HEADER */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Marketplace</p>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mi carrito</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>{items.length} {items.length === 1 ? "producto" : "productos"}</p>
        </div>
        <button onClick={clear} className="text-sm font-semibold cursor-pointer" style={{ color: "#DC2626" }}>
          Vaciar carrito
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

        {/* LISTA PRODUCTOS */}
        <div className="md:col-span-2 space-y-3">
          {items.map((it) => (
            <div key={it.id} className="bg-white rounded-2xl p-4 flex gap-4 items-center"
              style={{ border: "1.5px solid var(--nomi-border)" }}>
              <img src={it.image || "/no-image.png"} alt={it.name}
                className="w-20 h-20 rounded-xl object-cover shrink-0"
                style={{ border: "1px solid var(--nomi-border)" }}
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />

              <div className="flex-1 min-w-0">
                <p className="font-bold text-sm truncate" style={{ color: "var(--nomi-navy)" }}>{it.name}</p>
                <p className="text-sm mt-0.5" style={{ color: "var(--nomi-muted)" }}>{money(it.price)}</p>

                <div className="flex items-center gap-2 mt-2">
                  <button onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black cursor-pointer text-lg"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
                    −
                  </button>
                  <span className="w-8 text-center font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{it.qty}</span>
                  <button onClick={() => setQty(it.id, it.qty + 1)}
                    className="w-8 h-8 rounded-lg flex items-center justify-center font-black cursor-pointer text-lg"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
                    +
                  </button>
                </div>
              </div>

              <div className="text-right shrink-0 space-y-2">
                <p className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(it.price * it.qty)}</p>
                <button onClick={() => removeItem(it.id)} className="cursor-pointer"
                  style={{ color: "#DC2626" }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* RESUMEN */}
        <div className="space-y-4">
          <div className="bg-white rounded-2xl p-5 space-y-4 md:sticky md:top-24"
            style={{ border: "1.5px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Resumen</h2>

            <div className="space-y-2">
              {items.map((it) => (
                <div key={it.id} className="flex justify-between text-sm">
                  <span style={{ color: "var(--nomi-muted)" }}>{it.name} x{it.qty}</span>
                  <span style={{ color: "var(--nomi-navy)" }}>{money(it.price * it.qty)}</span>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3"
              style={{ borderTop: "1.5px solid var(--nomi-border)" }}>
              <span className="font-bold text-sm" style={{ color: "var(--nomi-muted)" }}>Total</span>
              <span className="font-black text-xl" style={{ color: "var(--nomi-navy)" }}>{money(subtotal)}</span>
            </div>

            <Link href="/market/checkout"
              className="w-full block text-center py-3.5 rounded-xl text-sm font-black cursor-pointer"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              Ir a pagar
            </Link>

            <Link href="/market"
              className="w-full block text-center py-3 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
              Seguir comprando
            </Link>

            <div className="text-xs text-center space-y-1" style={{ color: "var(--nomi-muted)" }}>
              <p>✓ 0% intereses</p>
              <p>✓ Descuento automatico por nomina</p>
              <p>✓ Sin estudio de credito</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
      </div>
    }>
      <CartPageContent />
    </Suspense>
  );
}
