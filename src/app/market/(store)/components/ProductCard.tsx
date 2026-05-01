"use client";

import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export default function ProductCard({ product }: any) {
  const { addItem } = useCart();

  const base = Number(product.price || 0);
  const disc = Number(product.discount_price || 0);
  const hasDiscount = disc > 0 && disc < base;

  const stock = Number(product.stock || 0);
  const isOut = stock <= 0;

  const pct =
    hasDiscount && base > 0 ? Math.round(((base - disc) / base) * 100) : 0;

  const img = product.main_image || "/no-image.png";

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOut) return;

    const priceToUse = hasDiscount ? disc : base;

    // ✅ OJO: addItem recibe el item SIN qty (CartProvider lo maneja)
    addItem({
      id: product.id,
      name: product.name || "Producto",
      price: priceToUse,
      image: img,
    });
  }

  return (
    <Link
      href={`/market/product/${product.id}`}
      className="group block border border-slate-800 rounded-2xl bg-slate-900 hover:border-emerald-500/60 transition overflow-hidden"
    >
      {/* IMAGE */}
      <div className="relative aspect-square bg-slate-800 overflow-hidden">
        <img
          src={img}
          alt={product.name || "Producto"}
          className={`w-full h-full object-cover transition ${
            isOut ? "opacity-70" : "group-hover:scale-105"
          }`}
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).src = "/no-image.png";
          }}
        />

        {/* BADGES */}
        <div className="absolute top-3 left-3 flex gap-2">
          {isOut ? (
            <span className="text-xs px-2 py-1 rounded-full bg-red-500/20 border border-red-500/30 text-red-200">
              Agotado
            </span>
          ) : (
            <span className="text-xs px-2 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/30 text-emerald-200">
              Disponible
            </span>
          )}

          {hasDiscount && (
            <span className="text-xs px-2 py-1 rounded-full bg-slate-950/60 border border-slate-700 text-slate-100">
              -{pct}%
            </span>
          )}
        </div>

        {/* CTA floating */}
        <div className="absolute bottom-3 right-3">
          <button
            onClick={handleAdd}
            disabled={isOut}
            className={`px-3 py-2 rounded-xl text-sm font-bold transition ${
              isOut
                ? "bg-slate-900/70 border border-slate-700 text-slate-400 cursor-not-allowed"
                : "bg-emerald-500 text-slate-950 hover:bg-emerald-400"
            }`}
            title={isOut ? "Sin stock" : "Agregar al carrito"}
          >
            {isOut ? "Sin stock" : "Agregar"}
          </button>
        </div>
      </div>

      {/* INFO */}
      <div className="p-4 space-y-2">
        <div className="font-semibold text-slate-100 leading-tight">
          <div className="truncate">{product.name || "Producto"}</div>
        </div>

        <div className="text-slate-400 text-sm h-[36px] overflow-hidden">
          {product.description || "—"}
        </div>

        <div className="pt-1">
          {hasDiscount ? (
            <div className="flex items-baseline gap-2">
              <div className="text-emerald-300 font-extrabold text-lg">
                {product.discount_fmt}
              </div>
              <div className="text-slate-500 text-sm line-through">
                {product.price_fmt}
              </div>
            </div>
          ) : (
            <div className="text-emerald-300 font-extrabold text-lg">
              {product.price_fmt}
            </div>
          )}
        </div>

        <div className="pt-2">
          <div className="w-full text-center text-sm font-semibold rounded-xl py-2 bg-slate-800 group-hover:bg-slate-700 transition">
            Ver detalle
          </div>
        </div>
      </div>
    </Link>
  );
}