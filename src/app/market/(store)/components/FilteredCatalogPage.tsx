"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import ProductCard from "./ProductCard";

type FilterType = "all" | "category" | "subcategory" | "brand";

type Props = {
  filterType: FilterType;
  filterValue: string;
};

type Brand = {
  id: string;
  name: string | null;
};

type MarketCategory = {
  id: string;
  name: string;
};

type MarketSubcategory = {
  id: string;
  category_name: string;
  name: string;
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

export default function FilteredCatalogPage({ filterType, filterValue }: Props) {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);

  const [brandId, setBrandId] = useState(filterType === "brand" ? filterValue : "ALL");
  const [category, setCategory] = useState(filterType === "category" ? filterValue : "ALL");
  const [subcategory, setSubcategory] = useState(
    filterType === "subcategory" ? filterValue : "ALL"
  );

  const [sort, setSort] = useState<"NEW" | "PRICE_ASC" | "PRICE_DESC">("NEW");
  const [onlyAvailable, setOnlyAvailable] = useState(false);
  const [onlyDiscount, setOnlyDiscount] = useState(false);

  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const totalPages = useMemo(() => {
    const t = Math.ceil((total || 0) / pageSize);
    return t <= 0 ? 1 : t;
  }, [total]);

  const filteredSubcategories = useMemo(() => {
    if (category === "ALL") return subcategories;

    return subcategories.filter(
      (s) => s.category_name.trim().toLowerCase() === category.trim().toLowerCase()
    );
  }, [subcategories, category]);

  const pageTitle = useMemo(() => {
    if (filterType === "all") return "Todos los productos";
    if (filterType === "category") return `Categoría: ${filterValue}`;
    if (filterType === "subcategory") return `Subcategoría: ${filterValue}`;

    const brandName = brands.find((b) => b.id === filterValue)?.name;
    return brandName ? `Marca: ${brandName}` : "Marca";
  }, [filterType, filterValue, brands]);

  useEffect(() => {
    async function loadFilters() {
      const [{ data: b }, { data: c }, { data: s }] = await Promise.all([
        supabase
          .from("product_brands")
          .select("id,name")
          .eq("active", true)
          .order("name", { ascending: true }),

        supabase
          .from("market_categories")
          .select("id,name")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),

        supabase
          .from("market_subcategories")
          .select("id,category_name,name")
          .eq("active", true)
          .order("sort_order", { ascending: true })
          .order("name", { ascending: true }),
      ]);

      setBrands((b || []) as Brand[]);
      setCategories((c || []) as MarketCategory[]);
      setSubcategories((s || []) as MarketSubcategory[]);
    }

    loadFilters();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [brandId, category, subcategory, sort, onlyAvailable, onlyDiscount]);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setErr(null);

      try {
        let query = supabase
          .from("products")
          .select(
            "id, name, description, price, discount_price, stock, active, brand_id, product_brand_id, category, subcategory, images, image_url, created_at",
            { count: "exact" }
          )
          .eq("active", true);

        if (brandId !== "ALL") query = query.eq("product_brand_id", brandId);
        if (category !== "ALL") query = query.eq("category", category);
        if (subcategory !== "ALL") query = query.eq("subcategory", subcategory);
        if (onlyAvailable) query = query.gt("stock", 0);
        if (onlyDiscount) query = query.gt("discount_price", 0);

        if (sort === "PRICE_ASC") query = query.order("price", { ascending: true });
        if (sort === "PRICE_DESC") query = query.order("price", { ascending: false });
        if (sort === "NEW") query = query.order("created_at", { ascending: false });

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

        const mapped = (data || []).map((p: any) => {
          const base = Number(p.price || 0);
          const disc = Number(p.discount_price || 0);

          return {
            ...p,
            main_image: getMainImage(p),
            price_fmt: formatCOP(base),
            discount_fmt: formatCOP(disc),
            description: p.description || "",
            price: base,
            discount_price: disc,
            stock: Number(p.stock || 0),
          };
        });

        setProducts(mapped);
        setTotal(count || 0);
        setLoading(false);
      } catch (e: any) {
        setErr(e?.message || "Error cargando productos");
        setProducts([]);
        setTotal(0);
        setLoading(false);
      }
    }

    loadProducts();
  }, [brandId, category, subcategory, sort, onlyAvailable, onlyDiscount, page]);

  function resetFilters() {
    setBrandId(filterType === "brand" ? filterValue : "ALL");
    setCategory(filterType === "category" ? filterValue : "ALL");
    setSubcategory(filterType === "subcategory" ? filterValue : "ALL");
    setSort("NEW");
    setOnlyAvailable(false);
    setOnlyDiscount(false);
    setPage(1);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-2xl md:text-3xl font-black text-slate-900">
          {pageTitle}
        </h1>
        <p className="text-slate-500 text-sm mt-1">
          Explora productos disponibles y ajusta los filtros según tu necesidad.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <aside className="md:col-span-3">
          <div className="bg-white border border-slate-200 rounded-2xl p-4 space-y-4 sticky top-6">
            <div>
              <h2 className="font-black text-slate-900">Filtros</h2>
              <p className="text-xs text-slate-500">
                Refina el catálogo.
              </p>
            </div>

            <div>
              <label className="text-xs text-slate-500">Marca</label>
              <select
                value={brandId}
                onChange={(e) => setBrandId(e.target.value)}
                disabled={filterType === "brand"}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="ALL">Todas</option>
                {brands.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name || "Marca"}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">Categoría</label>
              <select
                value={category}
                onChange={(e) => {
                  setCategory(e.target.value);
                  setSubcategory("ALL");
                }}
                disabled={filterType === "category"}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="ALL">Todas</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.name}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">Subcategoría</label>
              <select
                value={subcategory}
                onChange={(e) => setSubcategory(e.target.value)}
                disabled={filterType === "subcategory"}
                className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 mt-1 disabled:bg-slate-100 disabled:text-slate-400"
              >
                <option value="ALL">Todas</option>
                {filteredSubcategories.map((s) => (
                  <option key={s.id} value={s.name}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-500">Ordenar</label>
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

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyAvailable}
                onChange={(e) => setOnlyAvailable(e.target.checked)}
              />
              Solo disponibles
            </label>

            <label className="flex items-center gap-2 text-sm text-slate-700">
              <input
                type="checkbox"
                checked={onlyDiscount}
                onChange={(e) => setOnlyDiscount(e.target.checked)}
              />
              Solo descuento
            </label>

            <button
              onClick={resetFilters}
              className="w-full px-4 py-2 rounded-xl border border-slate-200 text-slate-700 hover:bg-slate-50 transition text-sm cursor-pointer"
            >
              Limpiar filtros
            </button>
          </div>
        </aside>

        <section className="md:col-span-9 space-y-5">
          <div className="flex items-center justify-between">
            <p className="text-sm text-slate-500">
              {loading
                ? "Cargando..."
                : `${total} producto(s) • Página ${page} de ${totalPages}`}
            </p>
          </div>

          {err && (
            <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl p-3 text-sm">
              Error cargando productos: {err}
            </div>
          )}

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
              {Array.from({ length: 9 }).map((_, i) => (
                <div
                  key={i}
                  className="border border-slate-200 rounded-2xl bg-white overflow-hidden animate-pulse"
                >
                  <div className="aspect-square bg-slate-100" />
                  <div className="p-4 space-y-3">
                    <div className="h-4 bg-slate-100 rounded w-3/4" />
                    <div className="h-3 bg-slate-100 rounded w-full" />
                    <div className="h-5 bg-slate-100 rounded w-1/2 mt-2" />
                  </div>
                </div>
              ))}
            </div>
          ) : products.length === 0 ? (
            <div className="border border-slate-200 bg-white rounded-2xl p-6 text-slate-700">
              <div className="font-semibold">No hay productos disponibles</div>
              <div className="text-sm text-slate-500 mt-1">
                Prueba ajustando los filtros.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-5">
                {products.map((p) => (
                  <ProductCard key={p.id} product={p} />
                ))}
              </div>

              <div className="flex items-center justify-center gap-3 pt-2">
                <button
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                  disabled={page <= 1}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-50 cursor-pointer"
                >
                  ← Anterior
                </button>

                <div className="text-sm text-slate-700">
                  Página <b>{page}</b> de <b>{totalPages}</b>
                </div>

                <button
                  onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  disabled={page >= totalPages}
                  className="px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 transition text-sm disabled:opacity-50 cursor-pointer"
                >
                  Siguiente →
                </button>
              </div>
            </>
          )}
        </section>
      </div>
    </div>
  );
}