"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function CartPageContent() {
  const { items, subtotal, setQty, removeItem, clear } = useCart();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-slate-900">Carrito</h1>

        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-sm font-semibold text-red-600 hover:text-red-700 underline"
          >
            Vaciar carrito
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border border-slate-200 bg-white rounded-lg p-6">
          <p className="text-slate-700">Tu carrito está vacío.</p>
          <Link href="/market" className="text-emerald-600 font-semibold">
            Volver al catálogo
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex gap-4 border border-[#071A3A]/25 bg-white rounded-xl p-4 items-center shadow-sm"
              >
                <img
                  src={it.image || "/no-image.png"}
                  alt={it.name}
                  className="w-20 h-20 rounded border border-slate-200 object-cover bg-slate-50"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/no-image.png";
                  }}
                />

                <div className="flex-1">
                  <p className="font-bold text-slate-900">{it.name}</p>
                  <p className="text-slate-600 text-sm">
                    {formatCOP(it.price)}
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}
                    className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border border-slate-200"
                  >
                    -
                  </button>

                  <input
                    value={it.qty}
                    onChange={(e) =>
                      setQty(it.id, Number(e.target.value || 1))
                    }
                    className="w-14 text-center bg-white text-slate-900 rounded py-1 border border-slate-300 font-semibold"
                    type="number"
                    min={1}
                  />

                  <button
                    onClick={() => setQty(it.id, it.qty + 1)}
                    className="px-3 py-1 rounded bg-slate-100 hover:bg-slate-200 text-slate-900 font-bold border border-slate-200"
                  >
                    +
                  </button>
                </div>

                <div className="w-32 text-right font-black text-emerald-600">
                  {formatCOP(it.price * it.qty)}
                </div>

                <button
                  onClick={() => removeItem(it.id)}
                  className="text-sm text-red-600 hover:text-red-700 font-semibold underline"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="border border-[#071A3A]/25 bg-white rounded-xl p-4 flex items-center justify-between shadow-sm">
            <div className="text-slate-700 font-semibold">Subtotal</div>
            <div className="text-emerald-600 text-xl font-black">
              {formatCOP(subtotal)}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/market"
              className="px-6 py-3 rounded bg-[#071A3A] text-white font-bold hover:bg-[#0B2552] transition"
            >
              Seguir comprando
            </Link>

            <Link
              href="/market/checkout"
              className="bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded hover:bg-emerald-400 transition"
            >
              Ir a pagar
            </Link>
          </div>
        </>
      )}
    </div>
  );
}

export default function CartPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando carrito...</div>}>
      <CartPageContent />
    </Suspense>
  );
}