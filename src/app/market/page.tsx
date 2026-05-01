"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import ProductCard from "./(store)/components/ProductCard";
import PromosSection from "./(store)/components/PromosSection";
import MarketValueCards from "./(store)/components/MarketValueCards";
import CategoriesCarousel from "./(store)/components/CategoriesCarousel";
import BestSellersByCategory from "./(store)/components/BestSellersByCategory";

type Brand = { id: string; name: string | null };

type MarketCategory = {
  id: string;
  name: string;
  image_url?: string | null;
};

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number.isFinite(n) ? n : 0);
}

function getMainImage(row: any): string | null {
  if (row?.main_image) return String(row.main_image);
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

function Chip({ label, onClear }: { label: string; onClear: () => void }) {
  return (
    <button
      onClick={onClear}
      className="inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs border border-slate-200 bg-white hover:bg-slate-50 transition"
      title="Quitar filtro"
    >
      <span className="text-slate-800">{label}</span>
      <span className="text-slate-400">✕</span>
    </button>
  );
}

export default function MarketplaceHome() {
  const sp = useSearchParams();

  const qFromUrl = useMemo(() => (sp.get("q") || "").trim(), [sp]);

  const [brandId, setBrandId] = useState<string>("ALL");
  const [category, setCategory] = useState<string>("ALL");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);
  const [sort, setSort] = useState<"NEW" | "PRICE_ASC" | "PRICE_DESC">("NEW");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const totalPages = useMemo(() => {
    const t = Math.ceil((total || 0) / pageSize);
    return t <= 0 ? 1 : t;
  }, [total]);

  const isHomeMode =
    !qFromUrl &&
    brandId === "ALL" &&
    category === "ALL" &&
    !onlyAvailable &&
    !onlyDiscount &&
    sort === "NEW";

  useEffect(() => {
    async function loadBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("id,name")
        .eq("active", true)
        .order("name", { ascending: true });

      if (!error) setBrands((data || []) as any);
    }

    loadBrands();
  }, []);

  useEffect(() => {
    async function loadCats() {
      const { data, error } = await supabase
        .from("market_categories")
        .select("id,name,image_url")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Categories error:", error.message);
        setCategories([]);
        return;
      }

      setCategories((data || []) as any);
    }

    loadCats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [brandId, category, onlyAvailable, onlyDiscount, sort, qFromUrl]);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const t = setTimeout(async () => {
      try {
        let query = supabase
          .from("products")
          .select(
            "id, name, description, price, discount_price, stock, active, brand_id, category, images, image_url, created_at",
            { count: "exact" }
          )
          .eq("active", true);

        if (brandId !== "ALL") query = query.eq("brand_id", brandId);
        if (category !== "ALL") query = query.eq("category", category);
        if (onlyAvailable) query = query.gt("stock", 0);
        if (onlyDiscount) query = query.gt("discount_price", 0);
        if (qFromUrl) query = query.ilike("name", `%${qFromUrl}%`);

        if (sort === "NEW") {
          query = query.order("created_at", { ascending: false });
        }

        if (sort === "PRICE_ASC") {
          query = query.order("price", { ascending: true });
        }

        if (sort === "PRICE_DESC") {
          query = query.order("price", { ascending: false });
        }

        const from = (page - 1) * pageSize;
        const to = from + pageSize - 1;

        const { data, error, count } = await query.range(from, to);

        if (error) {
          setErr(error.message);
          setProducts([]);
          setTotal(0);
          setLoading(false);
          return;
        }

        setTotal(count || 0);

        const mapped = (data || []).map((p: any) => {
          const base = Number(p.price || 0);
          const disc = Number(p.discount_price || 0);
          const main = getMainImage(p);

          return {
            ...p,
            main_image: main,
            price_fmt: formatCOP(base),
            discount_fmt: formatCOP(disc),
            description: p.description || "",
            price: base,
            discount_price: disc,
            stock: Number(p.stock || 0),
          };
        });

        setProducts(mapped);
        setLoading(false);
      } catch (e: any) {
        setErr(e?.message || "Error cargando productos");
        setProducts([]);
        setTotal(0);
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(t);
  }, [brandId, category, onlyAvailable, onlyDiscount, sort, qFromUrl, page]);

  function resetFilters() {
    setBrandId("ALL");
    setCategory("ALL");
    setOnlyAvailable(false);
    setOnlyDiscount(false);
    setSort("NEW");
    setPage(1);
  }

  const brandName = useMemo(() => {
    if (brandId === "ALL") return null;
    return brands.find((b) => b.id === brandId)?.name || "Marca";
  }, [brandId, brands]);

  const chips = useMemo(() => {
    const arr: { label: string; clear: () => void }[] = [];

    if (qFromUrl) {
      arr.push({
        label: `Búsqueda: "${qFromUrl}"`,
        clear: () => {},
      });
    }

    if (brandId !== "ALL") {
      arr.push({
        label: `Marca: ${brandName || "—"}`,
        clear: () => setBrandId("ALL"),
      });
    }

    if (category !== "ALL") {
      arr.push({
        label: `Categoría: ${category}`,
        clear: () => setCategory("ALL"),
      });
    }

    if (onlyAvailable) {
      arr.push({
        label: "Solo disponibles",
        clear: () => setOnlyAvailable(false),
      });
    }

    if (onlyDiscount) {
      arr.push({
        label: "Solo descuento",
        clear: () => setOnlyDiscount(false),
      });
    }

    if (sort === "PRICE_ASC") {
      arr.push({
        label: "Orden: Precio ↑",
        clear: () => setSort("NEW"),
      });
    }

    if (sort === "PRICE_DESC") {
      arr.push({
        label: "Orden: Precio ↓",
        clear: () => setSort("NEW"),
      });
    }

    return arr;
  }, [qFromUrl, brandId, brandName, category, onlyAvailable, onlyDiscount, sort]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      {/* FILTROS */}
      <div className="border border-slate-200 bg-white rounded-2xl p-4 space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-12 gap-3">
          <div className="md:col-span-4">
            <label className="text-xs text-slate-500">Marca</label>
            <select
              value={brandId}
              onChange={(e) => setBrandId(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1"
            >
              <option value="ALL">Todas</option>
              {brands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name || "Marca"}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="text-xs text-slate-500">Categoría</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1"
            >
              <option value="ALL">Todas</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div className="md:col-span-4">
            <label className="text-xs text-slate-500">Orden</label>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value as any)}
              className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1"
            >
              <option value="NEW">Más recientes</option>
              <option value="PRICE_ASC">Precio: menor → mayor</option>
              <option value="PRICE_DESC">Precio: mayor → menor</option>
            </select>
          </div>

          <div className="md:col-span-12 flex flex-col md:flex-row gap-2">
            <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              Solo disponibles
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700 bg-slate-50 border border-slate-200 rounded-xl px-3 py-2">
              <input
                type="checkbox"
                checked={onlyDiscount}
                onChange={(e) => setOnlyDiscount(e.target.checked)}
              />
              Solo descuento
            </label>

            <div className="flex-1" />

            <button
              onClick={resetFilters}
              className="px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-sm"
            >
              Limpiar filtros
            </button>
          </div>
        </div>

        {chips.length > 0 && (
          <div className="flex flex-wrap gap-2 pt-1">
            {chips.map((c, i) => (
              <Chip key={i} label={c.label} onClear={c.clear} />
            ))}
          </div>
        )}

        {qFromUrl && (
          <div className="text-xs text-slate-500">
            Búsqueda activa: <b>{qFromUrl}</b>. Para quitarla, borra el texto del
            buscador del header y presiona “Buscar”.
          </div>
        )}
      </div>

      <PromosSection />

      {isHomeMode && (
        <>
          <MarketValueCards />

          <CategoriesCarousel
            categories={categories}
            onSelect={(name) => setCategory(name)}
          />

          <BestSellersByCategory />
        </>
      )}

      {!isHomeMode && (
        <>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl md:text-2xl font-extrabold text-slate-900">
                Catálogo
              </h1>
              <p className="text-slate-500 text-sm">
                {loading
                  ? "Cargando..."
                  : `${total} producto(s) • Página ${page} de ${totalPages}`}
              </p>
            </div>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              Error cargando productos: {err}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-2xl bg-white overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-slate-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-3 bg-slate-100 rounded w-5/6" />
                    <div className="h-5 bg-slate-100 rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-slate-200 bg-white rounded-2xl p-6 text-slate-700">
              <div className="font-semibold">No hay productos disponibles</div>
              <div className="text-sm text-slate-500 mt-1">
                Prueba quitando filtros o usando otra búsqueda.
              </div>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition text-sm"
              >
                Ver todo el catálogo
              </button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-50"
                >
                  ← Anterior
                </button>

                <div className="text-sm text-slate-700">
                  Página <b>{page}</b> de <b>{totalPages}</b>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-50"
                >
                  Siguiente →
                </button>
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}