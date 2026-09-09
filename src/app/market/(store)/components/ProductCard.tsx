"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useCart } from "@/components/cart/CartProvider";
import { supabase } from "@/lib/supabaseClient";

function MiniStars({ rating, count }: { rating: number; count: number }) {
  if (!rating || count === 0) return null;
  return (
    <div className="flex items-center gap-1">
      <div className="flex items-center gap-0.5">
        {Array.from({ length: 5 }).map((_, i) => {
          const val = i + 1;
          const filled = rating >= val;
          const half = !filled && rating >= val - 0.5;
          return (
            <span key={i} style={{ position: "relative", display: "inline-block", width: 12, height: 12 }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--nomi-border)" style={{ position: "absolute", top: 0, left: 0 }}>
                <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="none" />
              </svg>
              {(filled || half) && (
                <span style={{ position: "absolute", top: 0, left: 0, width: filled ? "100%" : "50%", overflow: "hidden", display: "inline-block" }}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--nomi-orange)">
                    <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" stroke="none" />
                  </svg>
                </span>
              )}
            </span>
          );
        })}
      </div>
      <span className="text-xs font-bold" style={{ color: "var(--nomi-navy)" }}>{rating.toFixed(1)}</span>
      <span className="text-xs" style={{ color: "var(--nomi-muted)" }}>({count})</span>
    </div>
  );
}

export default function ProductCard({ product }: any) {
  const { addItem } = useCart();
  const [toast, setToast] = useState(false);
  const [avgRating, setAvgRating] = useState<number>(0);
  const [reviewCount, setReviewCount] = useState<number>(0);

  useEffect(() => {
    async function loadRating() {
      const { data } = await supabase
        .from("product_reviews")
        .select("rating")
        .eq("product_id", product.id);
      if (data && data.length > 0) {
        const avg = Math.round((data.reduce((acc, r) => acc + Number(r.rating), 0) / data.length) * 10) / 10;
        setAvgRating(avg);
        setReviewCount(data.length);
      }
    }
    loadRating();
  }, [product.id]);

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
          Producto agregado al carrito
        </div>
      )}

      <Link
        href={`/market/product/${product.id}`}
        className="group block rounded-2xl bg-white overflow-hidden transition hover:shadow-lg hover:-translate-y-0.5"
        style={{ border: "1.5px solid var(--nomi-border)" }}
      >
        <div className="relative aspect-square overflow-hidden" style={{ backgroundColor: "var(--nomi-gray)" }}>
          <img
            src={img}
            alt={product.name || "Producto"}
            className={`w-full h-full object-cover transition duration-300 ${isOut ? "opacity-60" : "group-hover:scale-105"}`}
            onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }}
          />

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

        <div className="p-3.5 space-y-1.5">
          <div className="font-bold text-sm leading-tight truncate" style={{ color: "var(--nomi-navy)" }}>
            {product.name || "Producto"}
          </div>

          {avgRating > 0 && (
            <MiniStars rating={avgRating} count={reviewCount} />
          )}

          <div className="text-xs leading-snug line-clamp-2" style={{ color: "var(--nomi-muted)", minHeight: "2.5rem" }}>
            {product.description || "—"}
          </div>

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
              0% interes · pago por nomina
            </div>
          </div>

          <div className="pt-1.5">
            <div className="w-full text-center text-xs font-bold rounded-xl py-2 transition"
              style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)" }}>
              Ver detalle
            </div>
          </div>
        </div>
      </Link>
    </>
  );
}
