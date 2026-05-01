"use client";

import { Suspense } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

function CartPageContent() {
  const { items, subtotal, setQty, removeItem, clear } = useCart();

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Carrito</h1>

        {items.length > 0 && (
          <button
            onClick={clear}
            className="text-sm text-slate-300 hover:text-white underline"
          >
            Vaciar carrito
          </button>
        )}
      </div>

      {items.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-6">
          <p className="text-slate-300">Tu carrito está vacío.</p>
          <Link href="/market" className="text-emerald-400 font-semibold">
            Volver al catálogo
          </Link>
        </div>
      ) : (
        <>
          <div className="space-y-3">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex gap-4 border border-slate-800 bg-slate-900 rounded-lg p-4 items-center"
              >
                <img
                  src={it.image || "/no-image.png"}
                  alt={it.name}
                  className="w-20 h-20 rounded border border-slate-800 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src =
                      "/no-image.png";
                  }}
                />

                <div className="flex-1">
                  <p className="font-semibold">{it.name}</p>
                  <p className="text-slate-400 text-sm">${it.price}</p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setQty(it.id, Math.max(1, it.qty - 1))}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    -
                  </button>

                  <input
                    value={it.qty}
                    onChange={(e) =>
                      setQty(it.id, Number(e.target.value || 1))
                    }
                    className="w-14 text-center bg-slate-800 rounded py-1"
                    type="number"
                    min={1}
                  />

                  <button
                    onClick={() => setQty(it.id, it.qty + 1)}
                    className="px-3 py-1 rounded bg-slate-800 hover:bg-slate-700"
                  >
                    +
                  </button>
                </div>

                <div className="w-28 text-right font-bold text-emerald-400">
                  ${(it.price * it.qty).toFixed(2)}
                </div>

                <button
                  onClick={() => removeItem(it.id)}
                  className="text-sm text-red-300 hover:text-red-200 underline"
                >
                  Quitar
                </button>
              </div>
            ))}
          </div>

          <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 flex items-center justify-between">
            <div className="text-slate-300">Subtotal</div>
            <div className="text-emerald-400 text-xl font-bold">
              ${subtotal.toFixed(2)}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link
              href="/market"
              className="px-6 py-3 rounded border border-slate-700 text-slate-200 hover:bg-slate-900 transition"
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