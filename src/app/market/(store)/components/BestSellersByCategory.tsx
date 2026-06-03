"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "./ProductCard";
import { useRouter } from "next/navigation";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function extractFirstUrl(value: any): string | null {
  if (!value) return null;
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith("http")) return trimmed;
    try {
      const parsed = JSON.parse(trimmed);
      const found = extractFirstUrl(parsed);
      if (found) return found;
    } catch {}
    const match = trimmed.match(/https?:\/\/[^"',\]\}\s]+/);
    return match?.[0] || null;
  }
  if (Array.isArray(value)) {
    for (const item of value) {
      const found = extractFirstUrl(item);
      if (found) return found;
    }
  }
  if (typeof value === "object") {
    for (const key of ["url", "src", "image", "image_url", "publicUrl"]) {
      const found = extractFirstUrl(value[key]);
      if (found) return found;
    }
    for (const v of Object.values(value)) {
      const found = extractFirstUrl(v);
      if (found) return found;
    }
  }
  return null;
}

function getMainImage(row: any): string {
  return (
    extractFirstUrl(row?.main_image) ||
    extractFirstUrl(row?.image_url) ||
    extractFirstUrl(row?.images) ||
    extractFirstUrl(row?.product_images) ||
    extractFirstUrl(row?.image) ||
    "/no-image.png"
  );
}

export default function BestSellersByCategory() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data, error } = await supabase.rpc(
        "get_best_sellers_by_category",
        { p_limit_per_category: 10 }
      );
      setLoading(false);
      if (error) {
        console.error("Best sellers error:", error.message);
        setRows([]);
        return;
      }
      setRows(data || []);
    }
    load();
  }, []);

  const grouped = useMemo(() => {
    const map = new Map<string, any[]>();
    for (const row of rows) {
      const category = row.category || "General";
      if (!map.has(category)) map.set(category, []);
      const base = Number(row.price || 0);
      const disc = Number(row.discount_price || 0);
      const mainImage = getMainImage(row);
      map.get(category)?.push({
        ...row,
        id: row.id || row.product_id,
        name: row.name || row.product_name || "Producto",
        description: row.description || "",
        main_image: mainImage,
        image_url: mainImage,
        price_fmt: formatCOP(base),
        discount_fmt: formatCOP(disc),
        price: base,
        discount_price: disc,
        stock: Number(row.stock || 0),
      });
    }
    return Array.from(map.entries());
  }, [rows]);

  if (loading) {
    return (
      <div className="space-y-8">
        {[1, 2].map((s) => (
          <div key={s} className="space-y-4">
            <div className="h-5 w-56 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-border)" }} />
            <div className="flex gap-4">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="shrink-0 w-[200px] h-72 rounded-2xl animate-pulse"
                  style={{ backgroundColor: "var(--nomi-gray)" }} />
              ))}
            </div>
          </div>
        ))}
      </div>
    );
  }

  if (!grouped.length) return null;

  return (
    <section className="space-y-10">
      {grouped.map(([category, products]) => (
        <div key={String(category)} className="space-y-4">

          {/* HEADER DE CATEGORÍA */}
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2 mb-1">
                <span className="text-xs font-bold uppercase tracking-widest"
                  style={{ color: "var(--nomi-teal)" }}>
                  Más vendidos
                </span>
                <span className="text-xs px-2.5 py-0.5 rounded-full font-bold"
                  style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
                  {String(category)}
                </span>
              </div>
              <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
                Lo más pedido en{" "}
                <span style={{ color: "var(--nomi-orange)" }}>{String(category)}</span>
              </h2>
            </div>
            <button
              onClick={() => router.push(`/market/catalog`)}
              className="text-xs font-bold hidden md:block shrink-0"
              style={{ color: "var(--nomi-teal)" }}>
              Ver todos →
            </button>
          </div>

          {/* SCROLL HORIZONTAL */}
          <div className="flex gap-4 overflow-x-auto pb-2 scroll-hide">
            {products.map((p) => (
              <div key={p.id} className="shrink-0 w-[200px]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}
