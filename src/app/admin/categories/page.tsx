"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Save, X, ChevronDown, ChevronRight } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editing, setEditing] = useState<string | null>(null);
  const [editData, setEditData] = useState({ name: "", image_url: "" });
  const [newSub, setNewSub] = useState<Record<string, string>>({});
  const [savingCat, setSavingCat] = useState(false);
  const [savingSub, setSavingSub] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ text: string; ok: boolean } | null>(null);

  async function load() {
    const [cats, subs] = await Promise.all([
      supabase.from("market_categories").select("*").order("sort_order").order("name"),
      supabase.from("market_subcategories").select("*").order("sort_order").order("name"),
    ]);
    setCategories(cats.data || []);
    setSubcategories(subs.data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  function subsFor(catName: string) {
    return subcategories.filter(
      s => (s.category_name || "").toLowerCase() === (catName || "").toLowerCase()
    );
  }

  function startEdit(cat: any) {
    setEditing(cat.id);
    setEditData({ name: cat.name || "", image_url: cat.image_url || "" });
  }

  async function saveCat(id: string) {
    setSavingCat(true);
    const { error } = await supabase.from("market_categories")
      .update({ name: editData.name.trim(), image_url: editData.image_url.trim() || null })
      .eq("id", id);
    setSavingCat(false);
    if (error) {
      setMsg({ text: "Error: " + error.message, ok: false });
    } else {
      setMsg({ text: "Categoria actualizada", ok: true });
      setEditing(null);
      load();
      setTimeout(() => setMsg(null), 3000);
    }
  }

  async function addSub(catName: string, catId: string) {
    const name = (newSub[catId] || "").trim();
    if (!name) return;
    setSavingSub(catId);
    const { error } = await supabase.from("market_subcategories").insert({
      name,
      category_name: catName,
      active: true,
      sort_order: 0,
    });
    setSavingSub(null);
    if (error) {
      setMsg({ text: "Error: " + error.message, ok: false });
    } else {
      setMsg({ text: `Subcategoria "${name}" creada`, ok: true });
      setNewSub(p => ({ ...p, [catId]: "" }));
      load();
      setTimeout(() => setMsg(null), 3000);
    }
  }

  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
    borderRadius: "10px",
    padding: "8px 12px",
    fontSize: "13px",
    outline: "none",
    width: "100%",
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>
          Categorias
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {categories.length} categorias · {subcategories.length} subcategorias
        </p>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={msg.ok
            ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
            : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {msg.text}
        </div>
      )}

      <div className="space-y-3">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="h-16 rounded-2xl animate-pulse"
              style={{ backgroundColor: "var(--nomi-border)" }} />
          ))
        ) : categories.map((cat) => {
          const subs = subsFor(cat.name);
          const isExpanded = expanded === cat.id;
          const isEditing = editing === cat.id;

          return (
            <div key={cat.id} className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid var(--nomi-border)" }}>

              {/* HEADER CATEGORIA */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => setExpanded(isExpanded ? null : cat.id)}
                  className="cursor-pointer shrink-0" style={{ color: "var(--nomi-muted)" }}>
                  {isExpanded
                    ? <ChevronDown className="w-4 h-4" />
                    : <ChevronRight className="w-4 h-4" />}
                </button>

                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                  {cat.image_url
                    ? <img src={cat.image_url} className="w-full h-full object-cover" alt={cat.name} />
                    : <div className="w-full h-full flex items-center justify-center text-lg">📁</div>}
                </div>

                {isEditing ? (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input value={editData.name}
                      onChange={(e) => setEditData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nombre categoria" style={inputStyle} />
                    <input value={editData.image_url}
                      onChange={(e) => setEditData(p => ({ ...p, image_url: e.target.value }))}
                      placeholder="URL imagen (opcional)" style={inputStyle} />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                      {cat.name}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                      {subs.length} subcategoria{subs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full hidden md:inline"
                    style={cat.active !== false
                      ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                      : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    {cat.active !== false ? "Activa" : "Inactiva"}
                  </span>

                  {isEditing ? (
                    <>
                      <button onClick={() => saveCat(cat.id)} disabled={savingCat}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                        style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                        <Save className="w-3 h-3" />
                        {savingCat ? "..." : "Guardar"}
                      </button>
                      <button onClick={() => setEditing(null)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl cursor-pointer"
                        style={{ backgroundColor: "var(--nomi-gray)" }}>
                        <X className="w-3.5 h-3.5" style={{ color: "var(--nomi-muted)" }} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => startEdit(cat)}
                      className="text-xs font-bold px-3 py-1.5 rounded-xl cursor-pointer"
                      style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1px solid rgba(245,166,35,0.3)" }}>
                      Editar
                    </button>
                  )}
                </div>
              </div>

              {/* SUBCATEGORIAS */}
              {isExpanded && (
                <div style={{ borderTop: "1px solid var(--nomi-border)" }}>
                  {subs.length > 0 && (
                    <div className="px-5 py-2">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center justify-between py-2"
                          style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                          <div className="flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full shrink-0"
                              style={{ backgroundColor: "var(--nomi-teal)" }} />
                            <span className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>
                              {s.name}
                            </span>
                          </div>
                          <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                            style={s.active !== false
                              ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                              : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                            {s.active !== false ? "Activa" : "Inactiva"}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AGREGAR SUBCATEGORIA */}
                  <div className="px-5 py-3 flex gap-2"
                    style={{ backgroundColor: "var(--nomi-gray)" }}>
                    <input
                      value={newSub[cat.id] || ""}
                      onChange={(e) => setNewSub(p => ({ ...p, [cat.id]: e.target.value }))}
                      onKeyDown={(e) => { if (e.key === "Enter") addSub(cat.name, cat.id); }}
                      placeholder="Nueva subcategoria..."
                      className="flex-1 px-3 py-2 rounded-xl text-sm outline-none"
                      style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}
                    />
                    <button
                      onClick={() => addSub(cat.name, cat.id)}
                      disabled={savingSub === cat.id || !(newSub[cat.id] || "").trim()}
                      className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: "var(--nomi-teal)", color: "#fff" }}>
                      <Plus className="w-3.5 h-3.5" />
                      {savingSub === cat.id ? "..." : "Agregar"}
                    </button>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
