"use client";

import { useEffect, useMemo, useState } from "react";
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

export default function ProductView() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);

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

    const price = Number(product.price ?? 0);

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
    router.push("/market/cart");
  }

  if (loading) return <div className="p-10">Cargando...</div>;
  if (!product) return <div className="p-10 text-red-400">Producto no encontrado</div>;

  return (
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

        <p className="text-emerald-400 text-3xl font-bold">${product.price}</p>

        <button
          onClick={handleAdd}
          disabled={adding}
          className="bg-emerald-500 text-black font-bold px-6 py-3 rounded hover:bg-emerald-400 transition disabled:opacity-60"
        >
          {adding ? "Agregando..." : "Agregar al carrito"}
        </button>
      </div>
    </div>
  );
}