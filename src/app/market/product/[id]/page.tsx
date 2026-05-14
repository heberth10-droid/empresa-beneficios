"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

function normalizeImages(images: any): string[] {
  if (Array.isArray(images)) return images.filter((x) => typeof x === "string");

  if (typeof images === "string") {
    const t = images.trim();

    if (t.startsWith("[") && t.endsWith("]")) {
      try {
        const parsed = JSON.parse(t);
        if (Array.isArray(parsed)) return parsed.filter((x) => typeof x === "string");
      } catch {}
    }

    if (t.includes("http") && t.includes(",")) {
      return t
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http"));
    }

    if (t.startsWith("http")) return [t];
  }

  if (images && typeof images === "object") {
    const asString = String(images).trim();
    if (asString.includes("http") && asString.includes(",")) {
      return asString
        .split(",")
        .map((s) => s.trim())
        .filter((s) => s.startsWith("http"));
    }
    if (asString.startsWith("http")) return [asString];
  }

  return [];
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

export default function ProductView() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem, items, subtotal } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);

  useEffect(() => {
    async function load() {
      if (!id) return;

      const { data, error } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (error || !data) {
        router.push("/market");
        return;
      }

      setProduct(data);
      setLoading(false);
    }

    load();
  }, [id, router]);

  const img = useMemo(() => {
    if (!product) return "/no-image.png";
    const imgs = normalizeImages(product.images);
    const raw = imgs[0] || product.image_url || "";
    return raw ? encodeURI(raw) : "/no-image.png";
  }, [product]);

  async function handleAdd() {
    if (!product) return;

    setAdding(true);

    const base = Number(product.price ?? 0);
    const discount = Number(product.discount_price ?? 0);
    const hasDiscount = discount > 0 && discount < base;
    const price = hasDiscount ? discount : base;

    addItem(
      {
        id: product.id,
        name: product.name,
        price: isNaN(price) ? 0 : price,
        image: img,
      },
      1
    );

    setAdding(false);
    setCartPreviewOpen(true);

    setTimeout(() => setCartPreviewOpen(false), 4500);
  }

  if (loading) return <div className="p-10">Cargando...</div>;
  if (!product) return <div className="p-10 text-red-400">Producto no encontrado</div>;

  const basePrice = Number(product.price || 0);
  const discountPrice = Number(product.discount_price || 0);
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice;
  const finalPrice = hasDiscount ? discountPrice : basePrice;

  return (
    <>

      {cartPreviewOpen && (
        <div className="fixed top-0 right-0 h-full w-[360px] max-w-[90vw] bg-white text-slate-900 z-[70] shadow-2xl border-l border-slate-200 p-5 animate-[slideIn_.25s_ease-out]">
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black">Carrito</h2>
              <p className="text-sm text-slate-500">
                {items.length} producto(s) agregado(s)
              </p>
            </div>

            <button
              onClick={() => setCartPreviewOpen(false)}
              className="text-slate-400 hover:text-slate-900 text-xl"
            >
              ×
            </button>
          </div>

          <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
            {items.slice(-4).reverse().map((it) => (
              <div key={it.id} className="flex gap-3 border border-slate-200 rounded-xl p-3">
                <img
                  src={it.image || "/no-image.png"}
                  alt={it.name}
                  className="w-14 h-14 rounded-lg object-cover border border-slate-100"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/no-image.png";
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate">{it.name}</div>
                  <div className="text-xs text-slate-500">Cantidad: {it.qty}</div>
                  <div className="text-sm font-black text-emerald-600">
                    {formatCOP(it.price * it.qty)}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="border-t border-slate-200 mt-5 pt-4">
            <div className="flex items-center justify-between mb-4">
              <span className="text-slate-500">Subtotal</span>
              <span className="text-xl font-black text-emerald-600">
                {formatCOP(subtotal)}
              </span>
            </div>

            <Link
              href="/market/cart"
              className="block w-full text-center bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-3 rounded-xl transition"
            >
              Ir a comprar
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-4xl mx-auto flex flex-col md:flex-row gap-10 p-6">
        <div className="flex-1">
          <img
            src={img}
            alt={product?.name || "Producto"}
            className="w-full rounded-lg border border-slate-800"
            onError={(e) => {
              (e.currentTarget as HTMLImageElement).src = "/no-image.png";
            }}
          />
        </div>

        <div className="flex-1 space-y-4">
          <h1 className="text-3xl font-bold">{product.name}</h1>
          <p className="text-slate-400">{product.description}</p>

          {hasDiscount ? (
            <div className="space-y-1">
              <p className="text-emerald-400 text-3xl font-bold">
                {formatCOP(finalPrice)}
              </p>
              <p className="text-slate-500 line-through">{formatCOP(basePrice)}</p>
            </div>
          ) : (
            <p className="text-emerald-400 text-3xl font-bold">
              {formatCOP(finalPrice)}
            </p>
          )}

          <button
            onClick={handleAdd}
            disabled={adding}
            className="bg-emerald-500 text-black font-bold px-6 py-3 rounded hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {adding ? "Agregando..." : "Agregar al carrito"}
          </button>
        </div>
      </div>
    </>
  );
}