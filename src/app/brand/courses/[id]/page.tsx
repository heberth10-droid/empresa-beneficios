"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

export default function EditCoursePage() {
  const router = useRouter();
  const { id } = useParams();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [categories, setCategories] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [active, setActive] = useState(true);

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { router.push("/login"); return; }
      const { data: userRow } = await supabase.from("users").select("role").eq("auth_id", u.user.id).single();
      if (!userRow || userRow.role !== "BRAND_ADMIN") { router.push("/login"); return; }

      const { data: course } = await supabase.from("courses").select("*").eq("id", id).single();
      if (!course) { router.push("/brand/courses"); return; }

      setName(course.name || "");
      setDescription(course.description || "");
      setPrice(String(course.price || ""));
      setDiscount(course.discount_price ? String(course.discount_price) : "");
      setCategory(course.category || "");
      setImageUrl(course.image_url || "");
      setActive(course.active);

      const { data: cats } = await supabase.from("course_categories").select("id, name").eq("active", true).order("name");
      setCategories(cats || []);
      setLoading(false);
    }
    load();
  }, [id, router]);

  async function save() {
    if (!name.trim()) { setMsg({ ok: false, text: "El nombre es obligatorio." }); return; }
    setSaving(true);
    const { error } = await supabase.from("courses").update({
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      discount_price: discount ? Number(discount) : null,
      category: category || null,
      image_url: imageUrl.trim() || null,
      active,
    }).eq("id", id);
    setSaving(false);
    if (error) { setMsg({ ok: false, text: "Error: " + error.message }); return; }
    setMsg({ ok: true, text: "Curso actualizado correctamente." });
    setTimeout(() => router.push("/brand/courses"), 1200);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Cursos</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Editar curso</h1>
        </div>
        <button onClick={() => router.push("/brand/courses")}
          className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Volver
        </button>
      </div>

      {msg && <div className="px-4 py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: msg.ok ? "#DCFCE7" : "#FEE2E2", color: msg.ok ? "#16A34A" : "#DC2626" }}>{msg.text}</div>}

      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Informacion del curso</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre *</label>
            <input style={IS} value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
            <textarea style={{ ...IS, resize: "vertical" }} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Categoria</label>
            <select style={IS} value={category} onChange={(e) => setCategory(e.target.value)}>
              <option value="">Sin categoria</option>
              {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Imagen (URL)</label>
            <input style={IS} value={imageUrl} onChange={(e) => setImageUrl(e.target.value)} placeholder="https://..." />
            {imageUrl && <img src={imageUrl} className="mt-2 h-20 rounded-xl object-cover" alt="preview"
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Precio</p>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio *</label>
            <input style={IS} value={price} onChange={(e) => setPrice(e.target.value)} type="number" />
            {price && <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-teal)" }}>{money(Number(price))}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio con descuento</label>
            <input style={IS} value={discount} onChange={(e) => setDiscount(e.target.value)} type="number" />
            {discount && <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-orange)" }}>{money(Number(discount))}</p>}
          </div>
        </div>
        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setActive(!active)}
            className="w-10 h-6 rounded-full transition-all relative cursor-pointer"
            style={{ backgroundColor: active ? "var(--nomi-teal)" : "var(--nomi-border)" }}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
              style={{ left: active ? "22px" : "4px" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>
            Curso {active ? "activo" : "inactivo"}
          </span>
        </label>
      </div>

      <div className="flex gap-3 pb-6">
        <button onClick={save} disabled={saving}
          className="flex-1 py-3.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button onClick={() => router.push("/brand/courses")}
          className="px-6 py-3.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
