"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Globe, Plus, Trash2, Eye, EyeOff } from "lucide-react";

type Promo = {
  id: string;
  title: string | null;
  image_url: string;
  href: string | null;
  active: boolean;
  sort_order: number;
  starts_at: string | null;
  ends_at: string | null;
  created_at: string;
};

export default function AdminWebsitePage() {
  const [promos, setPromos] = useState<Promo[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  const [newPromo, setNewPromo] = useState({
    title: "", image_url: "", href: "", sort_order: 0,
  });

  async function load() {
    const { data } = await supabase
      .from("promos")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: false });
    setPromos(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function toggleActive(promo: Promo) {
    await supabase.from("promos").update({ active: !promo.active }).eq("id", promo.id);
    load();
  }

  async function deletePromo(id: string) {
    if (!confirm("Eliminar este banner?")) return;
    await supabase.from("promos").delete().eq("id", id);
    load();
  }

  async function addPromo() {
    if (!newPromo.image_url.trim()) {
      setMsg({ text: "La URL de imagen es obligatoria", ok: false });
      return;
    }
    setSaving(true);
    const { error } = await supabase.from("promos").insert({
      title: newPromo.title || null,
      image_url: newPromo.image_url,
      href: newPromo.href || null,
      sort_order: Number(newPromo.sort_order),
      active: true,
    });
    setSaving(false);
    if (error) {
      setMsg({ text: "Error: " + error.message, ok: false });
    } else {
      setMsg({ text: "Banner agregado correctamente", ok: true });
      setNewPromo({ title: "", image_url: "", href: "", sort_order: 0 });
      load();
    }
    setTimeout(() => setMsg(null), 4000);
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
  };

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Configuracion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Pagina web</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Gestiona los banners y promociones del marketplace
        </p>
      </div>

      {/* MEDIDAS RECOMENDADAS */}
      <div className="rounded-2xl p-5 flex items-start gap-4"
        style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px solid rgba(41,184,212,0.2)" }}>
        <Globe className="w-5 h-5 mt-0.5 shrink-0" style={{ color: "var(--nomi-teal)" }} />
        <div>
          <div className="font-bold text-sm mb-1" style={{ color: "var(--nomi-navy)" }}>
            Medidas recomendadas para imagenes
          </div>
          <div className="text-sm space-y-0.5" style={{ color: "var(--nomi-muted)" }}>
            <p>Banner desktop: <strong>1280 x 420 px</strong> (ratio 16:5)</p>
            <p>Banner movil: <strong>750 x 560 px</strong> (ratio ~4:3)</p>
            <p>Favicon: <strong>512 x 512 px</strong></p>
          </div>
        </div>
      </div>

      {/* AGREGAR BANNER */}
      <div className="bg-white rounded-2xl p-6"
        style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="flex items-center gap-2 mb-5">
          <Plus className="w-4 h-4" style={{ color: "var(--nomi-orange)" }} />
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
            Agregar nuevo banner
          </h2>
        </div>

        {msg && (
          <div className="mb-4 px-4 py-3 rounded-xl text-sm font-semibold"
            style={msg.ok
              ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
              : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
            {msg.text}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>Titulo (opcional)</label>
            <input className={inputClass} style={inputStyle}
              placeholder="Ej: Oferta de temporada"
              value={newPromo.title}
              onChange={(e) => setNewPromo(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>URL de la imagen *</label>
            <input className={inputClass} style={inputStyle}
              placeholder="https://... (1280x420px)"
              value={newPromo.image_url}
              onChange={(e) => setNewPromo(p => ({ ...p, image_url: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>Enlace al hacer clic (opcional)</label>
            <input className={inputClass} style={inputStyle}
              placeholder="https://... o /market/catalog"
              value={newPromo.href}
              onChange={(e) => setNewPromo(p => ({ ...p, href: e.target.value }))} />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>Orden (menor = primero)</label>
            <input type="number" className={inputClass} style={inputStyle}
              value={newPromo.sort_order}
              onChange={(e) => setNewPromo(p => ({ ...p, sort_order: Number(e.target.value) }))} />
          </div>
        </div>

        {newPromo.image_url && (
          <div className="mt-4">
            <p className="text-xs font-semibold mb-2" style={{ color: "var(--nomi-muted)" }}>
              Vista previa:
            </p>
            <img src={newPromo.image_url} className="w-full max-h-40 object-cover rounded-xl"
              style={{ border: "1.5px solid var(--nomi-border)" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
          </div>
        )}

        <button onClick={addPromo} disabled={saving}
          className="mt-5 px-6 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60 transition"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {saving ? "Guardando..." : "Agregar banner"}
        </button>
      </div>

      {/* LISTA DE BANNERS */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="px-5 py-4 flex items-center justify-between"
          style={{ borderBottom: "1px solid var(--nomi-border)" }}>
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
            Banners activos
          </h2>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
            {promos.length} banners
          </span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2].map(i => <div key={i} className="h-20 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : promos.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No hay banners. Agrega el primero arriba.
          </div>
        ) : promos.map((p) => (
          <div key={p.id} className="flex items-center gap-4 px-5 py-4 transition hover:bg-slate-50"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <img src={p.image_url} className="w-24 h-14 object-cover rounded-xl shrink-0"
              style={{ border: "1.5px solid var(--nomi-border)" }}
              onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
            <div className="flex-1 min-w-0">
              <div className="font-bold text-sm truncate" style={{ color: "var(--nomi-navy)" }}>
                {p.title || "Sin titulo"}
              </div>
              <div className="text-xs mt-0.5 truncate" style={{ color: "var(--nomi-muted)" }}>
                {p.href || "Sin enlace"} · Orden: {p.sort_order}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={p.active
                  ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                  : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {p.active ? "Visible" : "Oculto"}
              </span>
              <button onClick={() => toggleActive(p)}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition"
                style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" }}
                title={p.active ? "Ocultar" : "Mostrar"}>
                {p.active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
              <button onClick={() => deletePromo(p.id)}
                className="w-8 h-8 rounded-xl flex items-center justify-center cursor-pointer transition"
                style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}
                title="Eliminar">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
