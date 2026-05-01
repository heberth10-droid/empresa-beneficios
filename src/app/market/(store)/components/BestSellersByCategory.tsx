"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "./ProductCard";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function getMainImage(row: any): string | null {
  if (row?.image_url) return String(row.image_url);

  const images = row?.images;

  if (Array.isArray(images) && images.length > 0) return String(images[0]);

  if (typeof images === "string") {
    const s = images.trim();
    if (!s) return null;

    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr) && arr.length > 0) return String(arr[0]);
      } catch {}
    }

    const first = s.split(",").map((x) => x.trim()).filter(Boolean)[0];
    return first || null;
  }

  return null;
}

export default function BestSellersByCategory() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

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

      map.get(category)?.push({
        ...row,
        main_image: getMainImage(row),
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
      <div className="space-y-6">
        <div className="h-6 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-72 bg-slate-100 rounded-2xl animate-pulse"
            />
          ))}
        </div>
      </div>
    );
  }

  if (!grouped.length) return null;

  return (
    <section className="space-y-8">
      {grouped.map(([category, products]) => (
        <div key={category} className="space-y-3">
          <div className="flex items-end justify-between">
            <div>
              <h2 className="text-xl font-black text-slate-900">
                Más vendidos en {category}
              </h2>
              <p className="text-sm text-slate-500">
                Productos destacados según compras y actividad reciente.
              </p>
            </div>
          </div>

          <div className="flex gap-5 overflow-x-auto pb-2">
            {products.map((p) => (
              <div key={p.id} className="shrink-0 w-[220px]">
                <ProductCard product={p} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </section>
  );
}