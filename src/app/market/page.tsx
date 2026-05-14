"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

import ProductCard from "./(store)/components/ProductCard";
import PromosSection from "./(store)/components/PromosSection";
import MarketValueCards from "./(store)/components/MarketValueCards";
import CategoriesCarousel from "./(store)/components/CategoriesCarousel";
import BestSellersByCategory from "./(store)/components/BestSellersByCategory";

type Brand = {
  id: string;
  name: string | null;
  logo_url?: string | null;
};

type MarketCategory = {
  id: string;
  name: string;
  image_url?: string | null;
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

function BrandsCarousel({
  brands,
  onSelect,
}: {
  brands: Brand[];
  onSelect: (id: string) => void;
}) {
  if (!brands.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Marcas</h2>
          <p className="text-sm text-slate-500">
            Explora productos por marcas disponibles.
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => onSelect(brand.id)}
            className="shrink-0 w-36 rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition text-left cursor-pointer"
          >
            <div className="h-24 bg-slate-50 flex items-center justify-center p-4">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name || "Marca"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                  {(brand.name || "M").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="p-3">
              <div className="text-sm font-bold text-slate-900 truncate">
                {brand.name || "Marca"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}

function MarketplaceHomeContent() {
  const sp = useSearchParams();

  const qFromUrl = useMemo(() => (sp.get("q") || "").trim(), [sp]);
  const categoryFromUrl = useMemo(() => (sp.get("category") || "").trim(), [sp]);
  const subcategoryFromUrl = useMemo(
    () => (sp.get("subcategory") || "").trim(),
    [sp]
  );
  const brandFromUrl = useMemo(() => (sp.get("brand") || "").trim(), [sp]);

  const [brandId, setBrandId] = useState<string>(brandFromUrl || "ALL");
  const [category, setCategory] = useState<string>(categoryFromUrl || "ALL");
  const [subcategory, setSubcategory] = useState<string>(
    subcategoryFromUrl || "ALL"
  );

  const [sort] = useState<"NEW" | "PRICE_ASC" | "PRICE_DESC">("NEW");

  const [page, setPage] = useState(1);
  const pageSize = 12;

  const [brands, setBrands] = useState<Brand[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [total, setTotal] = useState<number>(0);

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    setBrandId(brandFromUrl || "ALL");
    setCategory(categoryFromUrl || "ALL");
    setSubcategory(subcategoryFromUrl || "ALL");
  }, [brandFromUrl, categoryFromUrl, subcategoryFromUrl]);

  const totalPages = useMemo(() => {
    const t = Math.ceil((total || 0) / pageSize);
    return t <= 0 ? 1 : t;
  }, [total]);

  const isHomeMode =
    !qFromUrl &&
    !brandFromUrl &&
    !categoryFromUrl &&
    !subcategoryFromUrl &&
    brandId === "ALL" &&
    category === "ALL" &&
    subcategory === "ALL" &&
    sort === "NEW";

  useEffect(() => {
    async function loadBrands() {
      const { data, error } = await supabase
        .from("product_brands")
        .select("id,name,logo_url")
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
    async function loadSubcats() {
      const { data, error } = await supabase
        .from("market_subcategories")
        .select("id,category_name,name")
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("name", { ascending: true });

      if (error) {
        console.error("Subcategories error:", error.message);
        setSubcategories([]);
        return;
      }

      setSubcategories((data || []) as any);
    }

    loadSubcats();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [brandId, category, subcategory, sort, qFromUrl]);

  useEffect(() => {
    setLoading(true);
    setErr(null);

    const t = setTimeout(async () => {
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
        if (qFromUrl) query = query.ilike("name", `%${qFromUrl}%`);

        query = query.order("created_at", { ascending: false });

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
  }, [brandId, category, subcategory, sort, qFromUrl, page]);

  function resetFilters() {
    setBrandId("ALL");
    setCategory("ALL");
    setSubcategory("ALL");
    setPage(1);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 space-y-5">
      <PromosSection />

      {isHomeMode && (
        <>
          <MarketValueCards />

          <CategoriesCarousel
            categories={categories}
            onSelect={(name) => {
              setCategory(name);
              setSubcategory("ALL");
            }}
          />

          <BrandsCarousel
            brands={brands}
            onSelect={(id) => {
              setBrandId(id);
              setCategory("ALL");
              setSubcategory("ALL");
            }}
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
                Prueba usando otra búsqueda o seleccionando otra categoría o marca.
              </div>
              <button
                onClick={resetFilters}
                className="mt-4 px-4 py-2 rounded-xl bg-emerald-600 text-white font-bold hover:bg-emerald-500 transition text-sm cursor-pointer"
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
        </>
      )}
    </div>
  );
}

export default function MarketplaceHome() {
  return (
    <Suspense fallback={<div className="p-6">Cargando marketplace...</div>}>
      <MarketplaceHomeContent />
    </Suspense>
  );
}