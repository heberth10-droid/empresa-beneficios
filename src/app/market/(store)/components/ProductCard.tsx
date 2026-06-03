"use client";

import { useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";

export default function ProductCard({ product }: any) {
  const { addItem } = useCart();
  const [toast, setToast] = useState(false);

  const base = Number(product.price || 0);
  const disc = Number(product.discount_price || 0);
  const hasDiscount = disc > 0 && disc < base;
  const stock = Number(product.stock || 0);
  const isOut = stock <= 0;
  const pct = hasDiscount && base > 0 ? Math.round(((base - disc) / base) * 100) : 0;
  const img = product.main_image || "/no-image.png";

  function handleAdd(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (isOut) return;
    addItem({
      id: product.id,
      name: product.name || "Producto",
      price: hasDiscount ? disc : base,
      image: img,
    });
    setToast(true);
    setTimeout(() => setToast(false), 2500);
  }

  return (
    <>
      {toast && (
        <div className="fixed top-5 right-5 z-[80] px-5 py-3 rounded-xl shadow-2xl font-bold text-sm text-white"
          style={{ backgroundColor: "var(--nomi-navy)" }}>
          ✓ Producto agregado al carrito
        </div>
      )}

      <Link
        href={`/market/product/${product.id}`}
        className="group block rounded-2xl bg-white overflow-hidden transition hover:shadow-lg hover:-translate-y-0.5"
        style={{ border: "1.5px solid var(--nomi-border)" }}
      >
        {/* IMAGEN */}
        <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: "var(--nomi-gray)" }}>
          <img
            src={img}
            alt={product.name || "Producto"}
            className={`w-full h-full object-cover transition duration-300 ${isOut ? "opacity-60" : "group-hover:scale-105"}`}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }}
          />

          {/* BADGES TOP */}
          <div className="absolute top-2.5 left-2.5 flex gap-1.5">
            {isOut ? (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-red-100 text-red-600">
                Agotado
              </span>
            ) : (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold"
                style={{ backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }}>
                Disponible
              </span>
            )}
            {hasDiscount && (
              <span className="text-xs px-2 py-0.5 rounded-full font-bold text-white"
                style={{ backgroundColor: "var(--nomi-orange)" }}>
                -{pct}%
              </span>
            )}
          </div>

          {/* BOTÓN AGREGAR */}
          <div className="absolute bottom-2.5 right-2.5">
            <button
              onClick={handleAdd}
              disabled={isOut}
              className="px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer"
              style={isOut
                ? { backgroundColor: "rgba(255,255,255,0.7)", color: "var(--nomi-muted)" }
                : { backgroundColor: "var(--nomi-orange)", color: "#fff" }}
              title={isOut ? "Sin stock" : "Agregar al carrito"}
            >
              {isOut ? "Sin stock" : "+ Agregar"}
            </button>
          </div>
        </div>

        {/* INFO */}
        <div className="p-3.5 space-y-1.5">
          <div className="font-bold text-sm leading-tight truncate" style={{ color: "var(--nomi-navy)" }}>
            {product.name || "Producto"}
          </div>

          <div className="text-xs leading-snug line-clamp-2" style={{ color: "var(--nomi-muted)", minHeight: "2.5rem" }}>
            {product.description || "—"}
          </div>

          {/* PRECIO */}
          <div className="pt-1">
            {hasDiscount ? (
              <div className="flex items-baseline gap-2">
                <span className="font-extrabold text-base" style={{ color: "var(--nomi-navy)" }}>
                  {product.discount_fmt}
                </span>
                <span className="text-xs line-through" style={{ color: "var(--nomi-muted)" }}>
                  {product.price_fmt}
                </span>
              </div>
            ) : (
              <span className="font-extrabold text-base" style={{ color: "var(--nomi-navy)" }}>
                {product.price_fmt}
              </span>
            )}
            <div className="text-xs mt-0.5 font-semibold" style={{ color: "var(--nomi-teal)" }}>
              0% interés · pago por nómina
            </div>
          </div>

          {/* VER DETALLE */}
          <div className="pt-1.5">
            <div className="w-full text-center text-xs font-bold rounded-xl py-2 transition"
              style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)" }}>
              Ver detalle →
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
