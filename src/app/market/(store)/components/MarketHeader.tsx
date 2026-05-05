"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Rocket,
  ShoppingBag,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

const NOVA_BLUE = "#071A3A";
const NOVA_AQUA = "#2FF0D6";

type MarketCategory = {
  id: string;
  name: string;
};

type MarketSubcategory = {
  id: string;
  category_name: string;
  name: string;
};

type ProductBrand = {
  id: string;
  name: string;
  logo_url?: string | null;
};

const searchInputClass =
  "w-full rounded-full px-4 py-2.5 pr-24 text-sm bg-white text-slate-900 placeholder-slate-400 border border-slate-300 focus:outline-none focus:ring-2 focus:ring-emerald-400 focus:border-emerald-400 shadow-sm";

function enc(value: string) {
  return encodeURIComponent(value);
}

export default function MarketHeader() {
  const router = useRouter();
  const sp = useSearchParams();
  const { count } = useCart();

  const initialQ = useMemo(() => sp.get("q") || "", [sp]);
  const [q, setQ] = useState("");

  const [buyOpen, setBuyOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(true);
  const [brandsOpen, setBrandsOpen] = useState(true);
  const [openCategory, setOpenCategory] = useState<string | null>(null);

  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);

  useEffect(() => {
    setQ(initialQ);
  }, [initialQ]);

  useEffect(() => {
    async function loadMenuData() {
      const [{ data: cats }, { data: subs }, { data: brands }] =
        await Promise.all([
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

          supabase
            .from("product_brands")
            .select("id,name,logo_url")
            .eq("active", true)
            .order("name", { ascending: true }),
        ]);

      setCategories((cats || []) as MarketCategory[]);
      setSubcategories((subs || []) as MarketSubcategory[]);
      setProductBrands((brands || []) as ProductBrand[]);
    }

    loadMenuData();
  }, []);

  function goSearch() {
    const value = q.trim();
    const url = value ? `/market?q=${encodeURIComponent(value)}` : "/market";
    router.push(url);
  }

  function subcatsFor(categoryName: string) {
    return subcategories.filter(
      (s) =>
        s.category_name.trim().toLowerCase() ===
        categoryName.trim().toLowerCase()
    );
  }

  function go(url: string) {
    setBuyOpen(false);
    router.push(url);
  }

  return (
    <header
      className="w-full border-b relative z-40"
      style={{
        backgroundColor: NOVA_BLUE,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-4 grid grid-cols-12 items-center gap-4">
        <div className="col-span-12 md:col-span-3 flex items-center justify-between md:block">
          <div>
            <Link
              href="/market"
              className="text-2xl font-black tracking-tight"
              style={{ color: NOVA_AQUA }}
            >
              NOVA
            </Link>
            <div className="text-xs" style={{ color: "rgba(47,240,214,0.75)" }}>
              Marketplace
            </div>
          </div>

          <div className="md:hidden flex items-center gap-4">
            <button
              onClick={() => router.push("/market/cart")}
              className="relative inline-flex items-center gap-2 text-sm font-semibold"
              style={{ color: "rgba(255,255,255,0.9)" }}
            >
              <ShoppingCart className="w-5 h-5" style={{ color: NOVA_AQUA }} />
              {count > 0 && (
                <span
                  className="inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold"
                  style={{ backgroundColor: NOVA_AQUA, color: NOVA_BLUE }}
                >
                  {count}
                </span>
              )}
            </button>

            <Link
              href="/login"
              className="text-sm font-semibold"
              style={{ color: NOVA_AQUA }}
            >
              Iniciar sesión
            </Link>
          </div>
        </div>

        <div className="col-span-12 md:col-span-6">
          <div className="relative">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") goSearch();
              }}
              placeholder="Buscar productos, marcas o categorías…"
              className={searchInputClass}
            />

            <button
              onClick={goSearch}
              className="absolute right-1 top-1 bottom-1 px-4 rounded-full text-sm font-bold transition"
              style={{
                backgroundColor: NOVA_AQUA,
                color: NOVA_BLUE,
              }}
            >
              Buscar
            </button>
          </div>

          <div className="mt-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <nav className="flex flex-wrap items-center justify-center sm:justify-start gap-2 relative">
              <Link
                href="/brand"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-bold transition shadow-sm"
                style={{
                  backgroundColor: "rgba(255,255,255,0.06)",
                  color: NOVA_AQUA,
                  border: "1px solid rgba(47,240,214,0.45)",
                }}
              >
                <Rocket className="w-4 h-4" />
                Quiero vender
              </Link>

              <Link
                href="/company"
                className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-bold transition border"
                style={{
                  color: NOVA_AQUA,
                  borderColor: "rgba(47,240,214,0.45)",
                  backgroundColor: "rgba(255,255,255,0.06)",
                }}
              >
                <Building2 className="w-4 h-4" />
                Soy empleador
              </Link>

              <div className="relative">
                <button
                  type="button"
                  onClick={() => setBuyOpen((v) => !v)}
                  className="inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs md:text-sm font-bold transition border"
                  style={{
                    color: NOVA_BLUE,
                    backgroundColor: NOVA_AQUA,
                    borderColor: "rgba(47,240,214,0.45)",
                  }}
                >
                  <ShoppingBag className="w-4 h-4" />
                  Comprar
                  <ChevronDown className="w-4 h-4" />
                </button>

                {buyOpen && (
                  <div className="absolute left-0 mt-3 w-[330px] max-h-[70vh] overflow-y-auto rounded-2xl border border-slate-200 bg-white shadow-2xl p-3 z-50">
                    <button
                      onClick={() => go("/market")}
                      className="w-full flex items-center justify-between px-3 py-3 rounded-xl text-sm font-bold text-slate-900 hover:bg-slate-50"
                    >
                      Ver todos los productos
                      <ChevronRight className="w-4 h-4 text-slate-400" />
                    </button>

                    <div className="border-t border-slate-100 my-2" />

                    <button
                      onClick={() => setCatsOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Categorías
                      {catsOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {catsOpen && (
                      <div className="space-y-1">
                        {categories.map((cat) => {
                          const subs = subcatsFor(cat.name);
                          const isOpen = openCategory === cat.name;

                          return (
                            <div key={cat.id} className="rounded-xl">
                              <div className="flex items-center">
                                <button
                                  onClick={() =>
                                    go(`/market?category=${enc(cat.name)}`)
                                  }
                                  className="flex-1 text-left px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  {cat.name}
                                </button>

                                {subs.length > 0 && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      setOpenCategory(isOpen ? null : cat.name)
                                    }
                                    className="p-2 rounded-lg hover:bg-slate-50 text-slate-500"
                                  >
                                    {isOpen ? (
                                      <ChevronDown className="w-4 h-4" />
                                    ) : (
                                      <ChevronRight className="w-4 h-4" />
                                    )}
                                  </button>
                                )}
                              </div>

                              {isOpen && subs.length > 0 && (
                                <div className="ml-4 border-l border-slate-100 pl-2 pb-2">
                                  {subs.map((sub) => (
                                    <button
                                      key={sub.id}
                                      onClick={() =>
                                        go(
                                          `/market?category=${enc(
                                            cat.name
                                          )}&subcategory=${enc(sub.name)}`
                                        )
                                      }
                                      className="block w-full text-left px-4 py-2 rounded-lg text-xs text-slate-500 hover:bg-slate-50 hover:text-slate-900"
                                    >
                                      {sub.name}
                                    </button>
                                  ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    )}

                    <div className="border-t border-slate-100 my-2" />

                    <button
                      onClick={() => setBrandsOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold text-slate-700 hover:bg-slate-50"
                    >
                      Marcas
                      {brandsOpen ? (
                        <ChevronDown className="w-4 h-4" />
                      ) : (
                        <ChevronRight className="w-4 h-4" />
                      )}
                    </button>

                    {brandsOpen && (
                      <div className="grid grid-cols-1 gap-1">
                        {productBrands.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => go(`/market?brand=${b.id}`)}
                            className="flex items-center gap-3 px-4 py-2 rounded-lg text-sm text-slate-700 hover:bg-slate-50"
                          >
                            {b.logo_url ? (
                              <img
                                src={b.logo_url}
                                alt={b.name}
                                className="w-7 h-7 object-contain rounded bg-white border border-slate-100"
                              />
                            ) : (
                              <span className="w-7 h-7 rounded bg-slate-100" />
                            )}
                            {b.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </nav>

            <div className="text-[11px] text-center sm:text-right text-white/60">
              Únete como marca o empresa aliada
            </div>
          </div>
        </div>

        <div className="hidden md:flex col-span-3 items-center justify-end gap-4">
          <button
            onClick={() => router.push("/market/cart")}
            className="relative inline-flex items-center gap-2 text-sm font-semibold transition"
            style={{ color: "rgba(255,255,255,0.9)" }}
          >
            <ShoppingCart className="w-5 h-5" style={{ color: NOVA_AQUA }} />
            <span className="hidden lg:inline">Carrito</span>
            {count > 0 && (
              <span
                className="ml-1 inline-flex items-center justify-center min-w-[20px] h-5 px-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: NOVA_AQUA, color: NOVA_BLUE }}
              >
                {count}
              </span>
            )}
          </button>

          <Link
            href="/login"
            className="text-sm font-semibold transition"
            style={{ color: NOVA_AQUA }}
          >
            Iniciar sesión
          </Link>
        </div>
      </div>
    </header>
  );
}