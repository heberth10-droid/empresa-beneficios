"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCourseCategoriesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editName, setEditName] = useState("");
  const [editDesc, setEditDesc] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };

  async function load() {
    const { data } = await supabase.from("course_categories").select("*").order("sort_order").order("name");
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function create() {
    if (!name.trim()) return;
    setSaving(true);
    const { error } = await supabase.from("course_categories").insert({ name: name.trim(), description: description.trim() || null });
    setSaving(false);
    if (error) { setMsg({ ok: false, text: "Error: " + error.message }); return; }
    setMsg({ ok: true, text: "Categoria creada." });
    setName(""); setDescription("");
    load();
  }

  async function saveEdit(id: string) {
    setSaving(true);
    const { error } = await supabase.from("course_categories").update({ name: editName.trim(), description: editDesc.trim() || null }).eq("id", id);
    setSaving(false);
    if (error) { setMsg({ ok: false, text: "Error: " + error.message }); return; }
    setMsg({ ok: true, text: "Guardado." });
    setEditId(null);
    load();
  }

  async function toggleActive(id: string, active: boolean) {
    await supabase.from("course_categories").update({ active: !active }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Cursos</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Categorias de cursos</h1>
      </div>

      {msg && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: msg.ok ? "#DCFCE7" : "#FEE2E2", color: msg.ok ? "#16A34A" : "#DC2626" }}>{msg.text}</div>}

      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Nueva categoria</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre *</label>
            <input style={IS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Marketing digital" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
            <input style={IS} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion opcional" />
          </div>
        </div>
        <button onClick={create} disabled={saving || !name.trim()}
          className="px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {saving ? "Guardando..." : "Crear categoria"}
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="grid grid-cols-3 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span>Nombre</span>
          <span>Descripcion</span>
          <span>Acciones</span>
        </div>
        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}</div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>No hay categorias aun</div>
        ) : rows.map((r) => (
          <div key={r.id} className="grid grid-cols-3 px-5 py-3.5 items-center" style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            {editId === r.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} style={{ ...IS, padding: "6px 10px", fontSize: "13px" }} />
                <input value={editDesc} onChange={(e) => setEditDesc(e.target.value)} style={{ ...IS, padding: "6px 10px", fontSize: "13px" }} />
                <div className="flex gap-2">
                  <button onClick={() => saveEdit(r.id)} disabled={saving}
                    className="px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer"
                    style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                    Guardar
                  </button>
                  <button onClick={() => setEditId(null)}
                    className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                    Cancelar
                  </button>
                </div>
              </>
            ) : (
              <>
                <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{r.name}</div>
                <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>{r.description || "-"}</div>
                <div className="flex gap-2 items-center">
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={r.active ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" } : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    {r.active ? "Activa" : "Inactiva"}
                  </span>
                  <button onClick={() => { setEditId(r.id); setEditName(r.name); setEditDesc(r.description || ""); }}
                    className="text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                    style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1px solid rgba(245,166,35,0.3)" }}>
                    Editar
                  </button>
                  <button onClick={() => toggleActive(r.id, r.active)}
                    className="text-xs font-semibold px-3 py-1.5 rounded-xl cursor-pointer"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                    {r.active ? "Desactivar" : "Activar"}
                  </button>
                </div>
              </>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
