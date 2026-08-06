"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Building2, ChevronDown, ChevronRight, Rocket,
  ShoppingCart, User, LogOut, BookOpen,
} from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

type MarketCategory = { id: string; name: string };
type MarketSubcategory = { id: string; category_name: string; name: string };
type ProductBrand = { id: string; name: string; logo_url?: string | null };
type CourseCategory = { id: string; name: string };

function enc(value: string) { return encodeURIComponent(value); }

const trustItems = [
  "✓ 0% intereses",
  "✓ Sin estudio de credito",
  "✓ Descuento automatico por nomina",
  "✓ Aprobacion inmediata",
  "✓ Sin codeudor",
  "✓ Pago seguro por nomina",
];

export default function MarketHeader() {
  const router = useRouter();
  const { count } = useCart();

  const [q, setQ] = useState("");
  const [productsOpen, setProductsOpen] = useState(false);
  const [coursesOpen, setCoursesOpen] = useState(false);
  const [catsOpen, setCatsOpen] = useState(false);
  const [brandsOpen, setBrandsOpen] = useState(false);
  const [courseCatsOpen, setCourseCatsOpen] = useState(false);
  const [openCategory, setOpenCategory] = useState<string | null>(null);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);

  const [mobileProdOpen, setMobileProdOpen] = useState(false);
  const [mobileProdCatsOpen, setMobileProdCatsOpen] = useState(false);
  const [mobileProdBrandsOpen, setMobileProdBrandsOpen] = useState(false);
  const [mobileOpenCat, setMobileOpenCat] = useState<string | null>(null);
  const [mobileCourseOpen, setMobileCourseOpen] = useState(false);
  const [mobileCourseCatsOpen, setMobileCourseCatsOpen] = useState(false);

  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);
  const [courseCategories, setCourseCategories] = useState<CourseCategory[]>([]);

  const [authUser, setAuthUser] = useState<any>(null);
  const [employeeName, setEmployeeName] = useState<string | null>(null);

  useEffect(() => {
    async function loadMenuData() {
      const [{ data: cats }, { data: subs }, { data: brands }, { data: ccats }] = await Promise.all([
        supabase.from("market_categories").select("id,name").eq("active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
        supabase.from("market_subcategories").select("id,category_name,name").eq("active", true).order("sort_order", { ascending: true }).order("name", { ascending: true }),
        supabase.from("product_brands").select("id,name,logo_url").eq("active", true).order("name", { ascending: true }),
        supabase.from("course_categories").select("id,name").eq("active", true).order("name", { ascending: true }),
      ]);
      setCategories((cats || []) as MarketCategory[]);
      setSubcategories((subs || []) as MarketSubcategory[]);
      setProductBrands((brands || []) as ProductBrand[]);
      setCourseCategories((ccats || []) as CourseCategory[]);
    }
    loadMenuData();
  }, []);

  useEffect(() => {
    async function checkSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) { setAuthUser(null); setEmployeeName(null); return; }
      const { data: userRow } = await supabase.from("users").select("role, company_id, employee_id").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE") { setAuthUser(null); return; }
      setAuthUser(user);
      let emp: any = null;
      if (userRow.employee_id) {
        const { data } = await supabase.from("employees").select("name").eq("id", userRow.employee_id).single();
        emp = data;
      }
      if (!emp && user.email) {
        const { data } = await supabase.from("employees").select("name").eq("company_id", userRow.company_id).eq("email", user.email).single();
        emp = data;
      }
      setEmployeeName(emp?.name?.split(" ")[0] || user.email || "Mi cuenta");
    }
    checkSession();
    const { data: listener } = supabase.auth.onAuthStateChange(() => { checkSession(); });
    return () => listener.subscription.unsubscribe();
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    setAuthUser(null); setEmployeeName(null);
    setUserMenuOpen(false); setMobileMenuOpen(false);
  }

  function goSearch() {
    const value = q.trim();
    router.push(value ? `/market/catalog?q=${encodeURIComponent(value)}` : "/market/catalog");
    setMobileMenuOpen(false);
  }

  function subcatsFor(categoryName: string) {
    return subcategories.filter((s) => s.category_name.trim().toLowerCase() === categoryName.trim().toLowerCase());
  }

  function go(url: string) {
    setProductsOpen(false); setCoursesOpen(false);
    setMobileMenuOpen(false);
    router.push(url);
  }

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-menu]")) {
        setProductsOpen(false); setCoursesOpen(false); setUserMenuOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <header className="w-full sticky top-0 z-40 shadow-sm"
      style={{ backgroundColor: "var(--nomi-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>

      <div className="hidden md:flex items-center justify-center gap-6 py-1.5 text-xs font-semibold"
        style={{ backgroundColor: "var(--nomi-navy-dark)" }}>
        {trustItems.map((txt) => <span key={txt} style={{ color: "var(--nomi-teal)" }}>{txt}</span>)}
      </div>

      <div className="md:hidden overflow-hidden py-1.5"
        style={{ backgroundColor: "var(--nomi-navy-dark)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="trust-ticker">
          {[...trustItems, ...trustItems].map((txt, i) => (
            <span key={i} className="trust-ticker-item" style={{ color: "var(--nomi-teal)" }}>{txt}</span>
          ))}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-3 flex items-center gap-4">

        {/* LOGO */}
        <Link href="/market" className="shrink-0 mr-3">
          <img src="/nomi-logo.png" alt="NOMI" style={{ height: '28px', width: 'auto' }} />
        </Link>

        {/* SEARCH desktop */}
        <div className="hidden md:flex flex-1 relative">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
            placeholder="Buscar productos, cursos, marcas o categorias..."
            className="w-full rounded-full px-5 py-2.5 pr-24 text-sm bg-white text-slate-900 placeholder-slate-400 border-0 focus:outline-none focus:ring-2 focus:ring-orange-400" />
          <button onClick={goSearch}
            className="absolute right-1 top-1 bottom-1 px-5 rounded-full text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Buscar
          </button>
        </div>

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

          <div className="relative" data-menu="products">
            <button type="button"
              onClick={() => { setProductsOpen((v) => !v); setCoursesOpen(false); setUserMenuOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold cursor-pointer"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              Productos <ChevronDown className="w-4 h-4" />
            </button>
            {productsOpen && (
              <div className="absolute right-0 mt-3 w-[310px] max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border p-2 z-50"
                style={{ borderColor: "var(--nomi-border)" }}>
                <button onClick={() => go("/market/catalog")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-900">
                  Ver todos los productos <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                <div className="border-t my-1.5" style={{ borderColor: "var(--nomi-border)" }} />
                <button onClick={() => setCatsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-700">
                  Categorias
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
                            <button onClick={() => go(`/market/category/${enc(cat.name)}`)}
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
                                <button key={sub.id} onClick={() => go(`/market/subcategory/${enc(sub.name)}`)}
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
                      <button key={b.id} onClick={() => go(`/market/brand/${b.id}`)}
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

          <div className="relative" data-menu="courses">
            <button type="button"
              onClick={() => { setCoursesOpen((v) => !v); setProductsOpen(false); setUserMenuOpen(false); }}
              className="inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-sm font-bold cursor-pointer"
              style={{ backgroundColor: "#8B5CF6", color: "#fff" }}>
              <BookOpen className="w-4 h-4" /> Cursos <ChevronDown className="w-4 h-4" />
            </button>
            {coursesOpen && (
              <div className="absolute right-0 mt-3 w-[260px] max-h-[70vh] overflow-y-auto rounded-2xl bg-white shadow-2xl border p-2 z-50"
                style={{ borderColor: "var(--nomi-border)" }}>
                <button onClick={() => go("/market/courses")}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-900">
                  Ver todos los cursos <ChevronRight className="w-4 h-4 text-slate-400" />
                </button>
                {courseCategories.length > 0 && (
                  <>
                    <div className="border-t my-1.5" style={{ borderColor: "var(--nomi-border)" }} />
                    <button onClick={() => setCourseCatsOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-sm font-bold hover:bg-slate-50 cursor-pointer text-slate-700">
                      Categorias
                      {courseCatsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {courseCatsOpen && (
                      <div className="space-y-0.5 ml-1">
                        {courseCategories.map((cat) => (
                          <button key={cat.id} onClick={() => go(`/market/courses?category=${enc(cat.name)}`)}
                            className="w-full text-left px-4 py-2 text-sm hover:bg-slate-50 rounded-lg cursor-pointer text-slate-700">
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

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

          {authUser ? (
            <div className="relative" data-menu="user">
              <button onClick={() => { setUserMenuOpen((v) => !v); setProductsOpen(false); setCoursesOpen(false); }}
                className="inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-bold cursor-pointer"
                style={{ backgroundColor: "rgba(255,255,255,0.1)", color: "#fff", border: "1px solid rgba(255,255,255,0.2)" }}>
                <User className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} />
                {employeeName}
              </button>
              {userMenuOpen && (
                <div className="absolute right-0 mt-3 w-48 rounded-2xl bg-white shadow-2xl border p-2 z-50"
                  style={{ borderColor: "var(--nomi-border)" }}>
                  <Link href="/employee" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                    style={{ color: "var(--nomi-navy)" }}>
                    <User className="w-4 h-4" /> Mi portal
                  </Link>
                  <Link href="/employee/orders" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                    style={{ color: "var(--nomi-navy)" }}>
                    Mis ordenes
                  </Link>
                  <Link href="/employee/installments" onClick={() => setUserMenuOpen(false)}
                    className="flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold hover:bg-slate-50 cursor-pointer"
                    style={{ color: "var(--nomi-navy)" }}>
                    Mis cuotas
                  </Link>
                  <div className="border-t my-1" style={{ borderColor: "var(--nomi-border)" }} />
                  <button onClick={logout}
                    className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold cursor-pointer hover:bg-red-50"
                    style={{ color: "#DC2626" }}>
                    <LogOut className="w-4 h-4" /> Cerrar sesion
                  </button>
                </div>
              )}
            </div>
          ) : (
            <Link href="/login"
              className="text-sm font-bold rounded-full px-4 py-1.5 transition"
              style={{ color: "#fff", backgroundColor: "var(--nomi-orange)" }}>
              Iniciar sesion
            </Link>
          )}
        </div>

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
          <button onClick={() => setMobileMenuOpen((v) => !v)} className="text-white p-1 cursor-pointer">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {mobileMenuOpen
                ? <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                : <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />}
            </svg>
          </button>
        </div>
      </div>

      <div className="md:hidden px-4 pb-3">
        <div className="relative">
          <input value={q} onChange={(e) => setQ(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") goSearch(); }}
            placeholder="Buscar productos y cursos..."
            className="w-full rounded-full px-4 py-2.5 pr-20 text-sm bg-white text-slate-900 placeholder-slate-400 border-0 focus:outline-none" />
          <button onClick={goSearch}
            className="absolute right-1 top-1 bottom-1 px-4 rounded-full text-xs font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Buscar
          </button>
        </div>
      </div>

      {mobileMenuOpen && (
        <div className="md:hidden border-t px-4 py-3 space-y-2 max-h-[80vh] overflow-y-auto"
          style={{ backgroundColor: "var(--nomi-navy-dark)", borderColor: "rgba(255,255,255,0.08)" }}>

          {authUser ? (
            <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
              <div className="flex items-center gap-2 px-4 py-3" style={{ backgroundColor: "rgba(255,255,255,0.06)" }}>
                <User className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} />
                <span className="text-sm font-bold text-white">{employeeName}</span>
              </div>
              <Link href="/employee" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                Mi portal
              </Link>
              <Link href="/employee/orders" onClick={() => setMobileMenuOpen(false)}
                className="flex items-center px-4 py-2.5 text-sm font-semibold"
                style={{ color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                Mis ordenes
              </Link>
              <button onClick={logout}
                className="w-full flex items-center gap-2 px-4 py-2.5 text-sm font-semibold cursor-pointer"
                style={{ color: "#F87171", borderTop: "1px solid rgba(255,255,255,0.08)" }}>
                <LogOut className="w-4 h-4" /> Cerrar sesion
              </button>
            </div>
          ) : (
            <Link href="/login" onClick={() => setMobileMenuOpen(false)}
              className="block text-sm font-black py-3 px-3 rounded-xl text-center"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              Iniciar sesion
            </Link>
          )}

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            <button onClick={() => setMobileProdOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold cursor-pointer"
              style={{ backgroundColor: "rgba(245,166,35,0.15)", color: "var(--nomi-orange)" }}>
              Productos
              {mobileProdOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {mobileProdOpen && (
              <div>
                <button onClick={() => go("/market/catalog")}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold cursor-pointer"
                  style={{ color: "rgba(255,255,255,0.9)", borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Ver todos los productos <ChevronRight className="w-4 h-4" />
                </button>
                <button onClick={() => setMobileProdCatsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold cursor-pointer"
                  style={{ color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  Categorias
                  {mobileProdCatsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {mobileProdCatsOpen && (
                  <div style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                    {categories.map((cat) => {
                      const subs = subcatsFor(cat.name);
                      const isOpen = mobileOpenCat === cat.name;
                      return (
                        <div key={cat.id}>
                          <div className="flex items-center" style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            <button onClick={() => go(`/market/category/${enc(cat.name)}`)}
                              className="flex-1 text-left px-6 py-2.5 text-sm cursor-pointer"
                              style={{ color: "rgba(255,255,255,0.75)" }}>
                              {cat.name}
                            </button>
                            {subs.length > 0 && (
                              <button onClick={() => setMobileOpenCat(isOpen ? null : cat.name)}
                                className="px-3 py-2.5 cursor-pointer" style={{ color: "rgba(255,255,255,0.4)" }}>
                                {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                              </button>
                            )}
                          </div>
                          {isOpen && subs.map((sub) => (
                            <button key={sub.id} onClick={() => go(`/market/subcategory/${enc(sub.name)}`)}
                              className="block w-full text-left px-10 py-2 text-xs cursor-pointer"
                              style={{ color: "rgba(255,255,255,0.5)", borderTop: "1px solid rgba(255,255,255,0.04)" }}>
                              {sub.name}
                            </button>
                          ))}
                        </div>
                      );
                    })}
                  </div>
                )}
                <button onClick={() => setMobileProdBrandsOpen((v) => !v)}
                  className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold cursor-pointer"
                  style={{ color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                  Marcas
                  {mobileProdBrandsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>
                {mobileProdBrandsOpen && (
                  <div style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                    {productBrands.map((b) => (
                      <button key={b.id} onClick={() => go(`/market/brand/${b.id}`)}
                        className="flex items-center gap-3 w-full text-left px-6 py-2.5 cursor-pointer"
                        style={{ borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                        {b.logo_url ? (
                          <img src={b.logo_url} className="w-5 h-5 object-contain rounded bg-white" alt={b.name} />
                        ) : (
                          <span className="w-5 h-5 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                            style={{ backgroundColor: "var(--nomi-navy)" }}>
                            {(b.name || "M").charAt(0).toUpperCase()}
                          </span>
                        )}
                        <span className="text-sm" style={{ color: "rgba(255,255,255,0.75)" }}>{b.name}</span>
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-2xl overflow-hidden" style={{ border: "1px solid rgba(255,255,255,0.12)" }}>
            <button onClick={() => setMobileCourseOpen((v) => !v)}
              className="w-full flex items-center justify-between px-4 py-3 text-sm font-bold cursor-pointer"
              style={{ backgroundColor: "rgba(139,92,246,0.2)", color: "#A78BFA" }}>
              Cursos
              {mobileCourseOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
            </button>
            {mobileCourseOpen && (
              <div>
                <button onClick={() => go("/market/courses")}
                  className="w-full flex items-center justify-between px-4 py-3 text-sm font-semibold cursor-pointer"
                  style={{ color: "rgba(255,255,255,0.9)", borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "rgba(255,255,255,0.04)" }}>
                  Ver todos los cursos <ChevronRight className="w-4 h-4" />
                </button>
                {courseCategories.length > 0 && (
                  <>
                    <button onClick={() => setMobileCourseCatsOpen((v) => !v)}
                      className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold cursor-pointer"
                      style={{ color: "rgba(255,255,255,0.8)", borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                      Categorias
                      {mobileCourseCatsOpen ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                    </button>
                    {mobileCourseCatsOpen && (
                      <div style={{ backgroundColor: "rgba(0,0,0,0.15)" }}>
                        {courseCategories.map((cat) => (
                          <button key={cat.id} onClick={() => go(`/market/courses?category=${enc(cat.name)}`)}
                            className="block w-full text-left px-6 py-2.5 text-sm cursor-pointer"
                            style={{ color: "rgba(255,255,255,0.7)", borderTop: "1px solid rgba(255,255,255,0.05)" }}>
                            {cat.name}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
          </div>

          <Link href="/brand" onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl"
            style={{ color: "var(--nomi-teal)" }}>
            <Rocket className="w-4 h-4" /> Quiero vender en NOMI
          </Link>

          <Link href="/company" onClick={() => setMobileMenuOpen(false)}
            className="flex items-center gap-2 text-sm font-semibold py-2.5 px-3 rounded-xl text-white/80">
            <Building2 className="w-4 h-4" /> Soy empleador
          </Link>
        </div>
      )}
    </header>
  );
}
