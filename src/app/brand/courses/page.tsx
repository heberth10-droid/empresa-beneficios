"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { BookOpen, Trash2 } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

export default function BrandCoursesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [courses, setCourses] = useState<any[]>([]);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [q, setQ] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  async function loadCourses(bId: string) {
    const { data } = await supabase.from("courses").select("*").eq("brand_id", bId).order("created_at", { ascending: false });
    setCourses(data || []);
  }

  useEffect(() => {
    async function init() {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { router.push("/login"); return; }
      const { data: userRow } = await supabase.from("users").select("role, brand_id").eq("auth_id", u.user.id).single();
      if (!userRow || userRow.role !== "BRAND_ADMIN") { router.push("/login"); return; }
      setBrandId(userRow.brand_id);
      await loadCourses(userRow.brand_id);
      setLoading(false);
    }
    init();
  }, [router]);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return courses;
    return courses.filter((c) => [c.name, c.category, c.description].join(" ").toLowerCase().includes(x));
  }, [courses, q]);

  async function deleteCourse(c: any) {
    if (!confirm(`¿Eliminar "${c.name}"? Esta accion no se puede deshacer.`)) return;
    setDeleting(c.id);
    const { error } = await supabase.from("courses").delete().eq("id", c.id);
    setDeleting(null);
    if (error) { setErr("Error eliminando: " + error.message); return; }
    if (brandId) await loadCourses(brandId);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Cursos</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mis cursos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            {filtered.length} de {courses.length} curso{courses.length !== 1 ? "s" : ""}
          </p>
        </div>
        <button onClick={() => router.push("/brand/courses/new")}
          className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          + Crear curso
        </button>
      </div>

      {err && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{err}</div>}

      <input placeholder="Buscar por nombre o categoria..."
        value={q} onChange={(e) => setQ(e.target.value)}
        className="w-full md:w-96 px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }} />

      {courses.length === 0 ? (
        <div className="bg-white rounded-2xl px-5 py-12 text-center" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <BookOpen className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--nomi-muted)" }}>Aun no tienes cursos creados</p>
          <button onClick={() => router.push("/brand/courses/new")}
            className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Crear primer curso
          </button>
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl px-5 py-10 text-center" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>No hay cursos que coincidan con "{q}"</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((c) => (
            <div key={c.id} className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
              <div className="h-40 overflow-hidden" style={{ backgroundColor: "var(--nomi-gray)" }}>
                {c.image_url
                  ? <img src={c.image_url} className="w-full h-full object-cover" alt={c.name}
                      onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                  : <div className="w-full h-full flex items-center justify-center">
                      <BookOpen className="w-12 h-12" style={{ color: "var(--nomi-border)" }} />
                    </div>}
              </div>
              <div className="p-4 space-y-2">
                <div className="flex items-start justify-between gap-2">
                  <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{c.name}</div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                    style={c.active ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" } : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    {c.active ? "Activo" : "Inactivo"}
                  </span>
                </div>
                {c.category && <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>{c.category}</div>}
                <div className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>{money(c.price)}</div>
                <div className="flex gap-2">
                  <button onClick={() => router.push(`/brand/courses/${c.id}`)}
                    className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
                    Editar
                  </button>
                  <button onClick={() => deleteCourse(c)} disabled={deleting === c.id}
                    className="w-10 h-10 flex items-center justify-center rounded-xl cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "#FEE2E2", border: "1.5px solid #FECACA" }}>
                    {deleting === c.id
                      ? <div className="w-4 h-4 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "#DC2626" }} />
                      : <Trash2 className="w-4 h-4" style={{ color: "#DC2626" }} />}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
