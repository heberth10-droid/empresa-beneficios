"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { BookOpen } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function CourseCatalogContent() {
  const sp = useSearchParams();
  const initialCat = sp.get("category") || "";
  const initialQ = sp.get("q") || "";

  const [courses, setCourses] = useState<any[]>([]);
  const [categories, setCategories] = useState<any[]>([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState(initialQ);
  const [category, setCategory] = useState(initialCat);
  const [sort, setSort] = useState("NEW");
  const [page, setPage] = useState(1);
  const pageSize = 24;

  useEffect(() => {
    supabase.from("course_categories").select("id, name").eq("active", true).order("name")
      .then(({ data }) => setCategories(data || []));
  }, []);

  useEffect(() => { setPage(1); }, [q, category, sort]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      let query = supabase
        .from("courses")
        .select("id, name, description, price, category, image_url", { count: "exact" })
        .eq("active", true);

      if (category) query = query.eq("category", category);
      if (q.trim()) query = query.or(`name.ilike.%${q.trim()}%,description.ilike.%${q.trim()}%,category.ilike.%${q.trim()}%`);

      if (sort === "PRICE_ASC") query = query.order("price", { ascending: true });
      else if (sort === "PRICE_DESC") query = query.order("price", { ascending: false });
      else if (sort === "AZ") query = query.order("name", { ascending: true });
      else if (sort === "ZA") query = query.order("name", { ascending: false });
      else query = query.order("created_at", { ascending: false });

      const from = (page - 1) * pageSize;
      const { data, count } = await query.range(from, from + pageSize - 1);
      setCourses(data || []);
      setTotal(count || 0);
      setLoading(false);
    }
    load();
  }, [category, q, sort, page]);

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  return (
    <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Marketplace</p>
        <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Cursos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {loading ? "Cargando..." : `${total} curso${total !== 1 ? "s" : ""} disponibles`}
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
        <select value={sort} onChange={(e) => setSort(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}>
          <option value="NEW">Mas recientes</option>
          <option value="PRICE_ASC">Precio: menor a mayor</option>
          <option value="PRICE_DESC">Precio: mayor a menor</option>
          <option value="AZ">A - Z</option>
          <option value="ZA">Z - A</option>
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
      ) : courses.length === 0 ? (
        <div className="bg-white rounded-2xl p-10 text-center" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <BookOpen className="w-12 h-12 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
          <p className="font-semibold text-sm" style={{ color: "var(--nomi-muted)" }}>No hay cursos con esos filtros</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {courses.map((c) => (
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
                  <div className="pt-1">
                    <span className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>{money(c.price)}</span>
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

          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm disabled:opacity-50 cursor-pointer">
                Anterior
              </button>
              <span className="text-sm" style={{ color: "var(--nomi-muted)" }}>
                Pagina <b style={{ color: "var(--nomi-navy)" }}>{page}</b> de <b style={{ color: "var(--nomi-navy)" }}>{totalPages}</b>
              </span>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages}
                className="px-4 py-2 rounded-xl bg-white border border-slate-200 text-sm disabled:opacity-50 cursor-pointer">
                Siguiente
              </button>
            </div>
          )}
        </>
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
