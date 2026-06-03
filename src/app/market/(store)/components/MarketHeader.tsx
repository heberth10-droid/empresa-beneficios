"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Building2,
  ChevronDown,
  ChevronRight,
  Rocket,
  ShoppingCart,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

type MarketCategory = { id: string; name: string };
type MarketSubcategory = { id: string; category_name: string; name: string };
type ProductBrand = { id: string; name: string; logo_url?: string | null };

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
  const [catsOpen, setCatsOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);

  useEffect(() => { setQ(initialQ); }, [initialQ]);

  useEffect(() => {
    async function loadMenuData() {
      const [{ data: cats }, { data: subs }, { data: brands }] =
        await Promise.all([
          supabase.from("market_categories").select("id,name").eq("active", true)
            .order("sort_order", { ascending: true }).order("name", { ascending: true }),
          supabase.from("market_subcategories").select("id,category_name,name").eq("active", true)
            .order("sort_order", { ascending: true }).order("name", { ascending: true }),
          supabase.from("product_brands").select("id,name,logo_url").eq("active", true)
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
    router.push(value ? `/market?q=${encodeURIComponent(value)}` : "/market");
    setMobileMenuOpen(false);
  }

  function subcatsFor(categoryName: string) {
    return subcategories.filter(
      (s) => s.category_name.trim().toLowerCase() === categoryName.trim().toLowerCase()
    );
  }

  function go(url: string) {
    setBuyOpen(false);
    setMobileMenuOpen(false);
    router.push(url);
  }

  return (
    <header className="w-full sticky top-0 z-40 shadow-sm"
      style={{ backgroundColor: "var(--nomi-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>

      {/* TRUST BAR */}
      <div className="hidden md:flex items-center justify-center gap-6 py-1.5 text-xs font-semibold"
        style={{ backgroundColor: "var(--nomi-navy-dark)" }}>
        {["✓ 0% intereses", "✓ Sin estudio de crédito", "✓ Descuento automático por nómina", "✓ Aprobación inmediata"].map((txt, i) => (
          <span key={i} style={{ color: "var(--nomi-teal)" }}>{txt}</span>
        ))}
      </div>

      {/* MAIN ROW */}
      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">

        {/* LOGO */}
        <Link href="/market" className="shrink-0 flex items-center mr-2">
          <span className="text-2xl font-black tracking-tight text-white">N</span>
          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full border-2 text-sm font-black mx-0.5"
            style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
          <span className="text-2xl font-black tracking-tight text-white">MI</span>
        </Link>

        {/* SEARCH — desktop */}
        <div className="hidden md:flex flex-1 relative">
          <input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
            placeholder="Buscar productos, marcas o categorías…"
            className="w-full rounded-full px-5 py-2.5 pr-24 text-sm bg-white text-slate-900 placeholder-slate-400 border-0 focus:outline-none focus:ring-2 focus:ring-orange-400"
          />
          <button onClick={goSearch}
            className="absolute right-1 top-1 bottom-1 px-5 rounded-full text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Buscar
          </button>
        </div>

        {/* ACTIONS — desktop */}
        <div className="hidden md:flex items-center gap-2 shrink-0">

          <Link href="/brand"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ color: "var(--nomi-teal)", backgroundColor: "rgba(41,184,212,0.1)", border: "1px solid rgba(41,184,212,0.3)" }}>
            <Rocket className="w-3.5 h-3.5" /> Vender
          </Link>

          <Link href="/company"
            className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-bold"
            style={{ color: "rgba(255,255,255,0.8)", backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.15)" }}>
            <Building2 className="w-3.5 h-3.5" /> Empleador
          </Link>

          {/* COMPRAR dropdown */}
          <div className="relative">
            <button type="button"
              onClick={() => { setBuyOpen((v) => !v); setCatsOpen(false); setBrandsOpen(false); setOpenCategory(null); }}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold cursor-pointer"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              Comprar <ChevronDown className="w-4 h-4" />
            </button>

            {buyOpen && (
              <div className="absolute right-0 mt-3 w-[310px] max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border p-2 z-50"
                style={{ borderColor: "var(--nomi-border)" }}>

                <button onClick={() => go("/market/catalog")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-900">
                  Ver todos los productos <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>

                <div className="border-t my-1.5" style={{ borderColor: "var(--nomi-border)" }} />

                <button onClick={() => setCatsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-700">
                  Categorías
                  {catsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {catsOpen && (
                  <div className="space-y-0.5 ml-1">
                    {categories.map((cat) => {
                      const subs = subcatsFor(cat.name);
                      const isOpen = openCategory === cat.name;
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center">
                            <button onClick={() => go(`/market/category=${enc(cat.name)}`)}
                              className="flex-1 text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700">
                              {cat.name}
                            </button>
                            {subs.length > 0 && (
                              <button onClick={() => setOpenCategory(isOpen ? null : cat.name)} className="p-2 cursor-pointer">
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          {isOpen && (
                            <div className="ml-4">
                              {subs.map((sub) => (
                                <button key={sub.id}
                                  onClick={() => go(`/market/subcategory/${enc(sub.name)}`)}
                                  className="block w-full text-left px-4 py-1.5 text-xs hover:bg-slate-50 rounded cursor-pointer text-slate-500">
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

                <div className="border-t my-1.5" style={{ borderColor: "var(--nomi-border)" }} />

                <button onClick={() => setBrandsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-700">
                  Marcas
                  {brandsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                {brandsOpen && (
                  <div className="space-y-0.5">
                    {productBrands.map((b) => (
                      <button key={b.id} onClick={() => go(`/market/brand=${b.id}`)}
                        className="flex items-center gap-2.5 px-3 py-2 w-full text-left hover:bg-slate-50 rounded-xl cursor-pointer">
                        {b.logo_url ? (
                          <img src={b.logo_url} className="w-6 h-6 object-contain rounded bg-white border"
                            style={{ borderColor: "var(--nomi-border)" }} alt={b.name} />
                        ) : (
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-xs font-black text-white"
                            style={{ backgroundColor: "var(--nomi-navy)" }}>
                            {(b.name || "M").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-sm text-slate-700">{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* CARRITO */}
          <button onClick={() => router.push("/market/cart")}
            className="relative inline-flex items-center gap-2 text-sm font-semibold cursor-pointer"
            style={{ color: "rgba(255,255,255,0.9)" }}>
            <ShoppingCart className="w-5 h-5" style={{ color: "var(--nomi-teal)" }} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                {count}
              </span>
            )}
          </button>

          <Link href="/login"
            className="text-sm font-bold rounded-full px-4 py-1.5 transition"
            style={{ color: "#fff", backgroundColor: "var(--nomi-orange)" }}>
            Iniciar sesión
          </Link>
        </div>

        {/* MOBILE RIGHT */}
        <div className="flex md:hidden items-center gap-3 ml-auto">
          <button onClick={() => router.push("/market/cart")} className="relative cursor-pointer">
            <ShoppingCart className="w-5 h-5" style={{ color: "var(--nomi-teal)" }} />
            {count > 0 && (
              <span className="absolute -top-2 -right-2 inline-flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full text-xs font-bold"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                {count}
              </span>
            )}
          </button>
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="text-white p-1 cursor-pointer" aria-label="Menú">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      {/* SEARCH — mobile */}
      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
            placeholder="Buscar productos…"
            className="w-full rounded-full px-4 py-2.5 pr-20 text-sm bg-white text-slate-900 placeholder-slate-400 border-0 focus:outline-none" />
          <button onClick={goSearch}
            className="absolute right-1 top-1 bottom-1 px-4 rounded-full text-xs font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Buscar
          </button>
        </div>
      </div>

      {/* MOBILE MENU */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 py-4 space-y-2"
          style={{ backgroundColor: "var(--nomi-navy-dark)", borderColor: "rgba(255,255,255,0.08)" }}>
          <button onClick={() => go("/market/catalog")}
            className="w-full text-left text-sm font-bold py-2.5 px-3 rounded-xl hover:bg-white/10 text-white cursor-pointer">
            Ver catálogo completo
          </button>
          <Link href="/brand" onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold py-2.5 px-3 rounded-xl hover:bg-white/10"
            style={{ color: "var(--nomi-teal)" }}>
            Quiero vender en NOMI
          </Link>
          <Link href="/company" onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-semibold py-2.5 px-3 rounded-xl hover:bg-white/10 text-white/80">
            Soy empleador
          </Link>
          <Link href="/login" onClick={() => setMobileMenuOpen(false)}
            className="block text-sm font-bold py-2.5 px-3 rounded-xl text-center"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Iniciar sesión
          </Link>
        </div>
      )}
    </header>
  );
}
