"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { BookOpen } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function CourseCatalogContent() {
  const sp = useSearchParams();
  const initialQ = sp.get("q") || "";
  const initialCat = sp.get("category") || "";

  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCat);

  useEffect(() => {
    async function load() {
      const [{ data: cats }, { data: crss }] = await Promise.all([
        supabase.from("course_categories").select("id, name").eq("active", true).order("name"),
        supabase.from("courses").select("id, name, description, price, discount_price, category, image_url, brand_id").eq("active", true).order("created_at", { ascending: false }),
      ]);
      setCategories(cats || []);
      setCourses(crss || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    return courses.filter((c) => {
      const matchCat = !category || c.category === category;
      const qx = q.trim().toLowerCase();
      const matchQ = !qx || [c.name, c.description, c.category].join(" ").toLowerCase().includes(qx);
      return matchCat && matchQ;
    });
  }, [courses, q, category]);

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Marketplace</p>
        <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Cursos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {loading ? "Cargando..." : `${filtered.length} curso${filtered.length !== 1 ? "s" : ""} disponibles`}
        </p>
      </div>

      <div className="flex flex-col md:flex-row gap-3">
        <input placeholder="Buscar cursos..."
          value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }} />
        <select value={category} onChange={(e) => setCategory(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}>
          <option value="">Todas las categorias</option>
          {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
        </select>
      </div>

      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {[1,2,3,4,5,6].map(i => (
            <div key={i} className="rounded-2xl overflow-hidden animate-pulse" style={{ border: "1.5px solid var(--nomi-border)" }}>
              <div className="h-44 bg-slate-100" />
              <div className="p-4 space-y-3">
                <div className="h-4 bg-slate-100 rounded w-3/4" />
                <div className="h-3 bg-slate-100 rounded w-full" />
                <div className="h-5 bg-slate-100 rounded w-1/2" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
          <p className="font-semibold text-sm" style={{ color: "var(--nomi-muted)" }}>No hay cursos disponibles con esos filtros</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
          {filtered.map((c) => (
            <Link key={c.id} href={`/market/course/${c.id}`}
              className="bg-white rounded-2xl overflow-hidden transition hover:shadow-md cursor-pointer block"
              style={{ border: "1.5px solid var(--nomi-border)" }}>
              <div className="h-44 overflow-hidden" style={{ backgroundColor: "var(--nomi-gray)" }}>
                {c.image_url
                  ? <img src={c.image_url} className="w-full h-full object-cover" alt={c.name}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12" style={{ color: "var(--nomi-border)" }} />
                    </div>}
              </div>
              <div className="p-4 space-y-2">
                {c.category && (
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: "#EDE9FE", color: "#8B5CF6" }}>{c.category}</span>
                )}
                <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{c.name}</div>
                {c.description && (
                  <p className="text-xs line-clamp-2" style={{ color: "var(--nomi-muted)" }}>{c.description}</p>
                )}
                <div className="flex items-center gap-2 pt-1">
                  {c.discount_price ? (
                    <>
                      <span className="font-black text-base" style={{ color: "var(--nomi-orange)" }}>{money(c.discount_price)}</span>
                      <span className="text-xs line-through" style={{ color: "var(--nomi-muted)" }}>{money(c.price)}</span>
                    </>
                  ) : (
                    <span className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>{money(c.price)}</span>
                  )}
                </div>
                <div className="pt-1">
                  <div className="w-full py-2.5 rounded-xl text-sm font-black text-center"
                    style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
                    Ver curso
                  </div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CoursesPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
      </div>
    }>
      <CourseCatalogContent />
    </Suspense>
  );
}
