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
      <div className="space-y-6">
        <div className="h-6 w-64 bg-slate-100 rounded animate-pulse" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
          {Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="h-72 bg-slate-100 rounded-2xl animate-pulse" />
          ))}
        </div>
      </div>
    );
  }

  if (!grouped.length) return null;

  return (
    <section className="space-y-8">
      {grouped.map(([category, products]) => (
        <div key={String(category)} className="space-y-3">
          <div>
            <h2 className="text-xl font-black text-slate-900">
              Más vendidos en {String(category)}
            </h2>
            <p className="text-sm text-slate-500">
              Productos destacados según compras y actividad reciente.
            </p>
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