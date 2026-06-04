"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Plus, Save, X, ChevronDown, ChevronRight, Trash2 } from "lucide-react";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState<string | null>(null);
  const [editingCat, setEditingCat] = useState<string | null>(null);
  const [editCatData, setEditCatData] = useState({ name: "", image_url: "" });
  const [editingSub, setEditingSub] = useState<string | null>(null);
  const [editSubName, setEditSubName] = useState("");
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

  function flash(text: string, ok: boolean) {
    setMsg({ text, ok });
    setTimeout(() => setMsg(null), 3000);
  }

  function subsFor(catName: string) {
    return subcategories.filter(
      s => (s.category_name || "").toLowerCase() === (catName || "").toLowerCase()
    );
  }

  async function saveCat(id: string) {
    setSavingCat(true);
    const { error } = await supabase.from("market_categories")
      .update({ name: editCatData.name.trim(), image_url: editCatData.image_url.trim() || null })
      .eq("id", id);
    setSavingCat(false);
    if (error) { flash("Error: " + error.message, false); return; }
    flash("Categoria actualizada", true);
    setEditingCat(null);
    load();
  }

  async function addSub(catName: string, catId: string) {
    const name = (newSub[catId] || "").trim();
    if (!name) return;
    setSavingSub(catId);
    const { error } = await supabase.from("market_subcategories").insert({
      name, category_name: catName, active: true, sort_order: 0,
    });
    setSavingSub(null);
    if (error) { flash("Error: " + error.message, false); return; }
    flash(`Subcategoria "${name}" creada`, true);
    setNewSub(p => ({ ...p, [catId]: "" }));
    load();
  }

  async function saveSub(id: string) {
    setSavingSub(id);
    const { error } = await supabase.from("market_subcategories")
      .update({ name: editSubName.trim() }).eq("id", id);
    setSavingSub(null);
    if (error) { flash("Error: " + error.message, false); return; }
    flash("Subcategoria actualizada", true);
    setEditingSub(null);
    load();
  }

  async function deleteSub(id: string, name: string) {
    if (!confirm(`Eliminar subcategoria "${name}"?`)) return;
    const { error } = await supabase.from("market_subcategories").delete().eq("id", id);
    if (error) { flash("Error: " + error.message, false); return; }
    flash(`Subcategoria "${name}" eliminada`, true);
    load();
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
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Categorias</h1>
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
          const isEditingCat = editingCat === cat.id;

          return (
            <div key={cat.id} className="bg-white rounded-2xl overflow-hidden"
              style={{ border: "1.5px solid var(--nomi-border)" }}>

              {/* HEADER */}
              <div className="flex items-center gap-3 px-5 py-4">
                <button onClick={() => setExpanded(isExpanded ? null : cat.id)}
                  className="cursor-pointer shrink-0" style={{ color: "var(--nomi-muted)" }}>
                  {isExpanded ? <ChevronDown className="w-4 h-4" /> : <ChevronRight className="w-4 h-4" />}
                </button>

                <div className="w-12 h-12 rounded-xl overflow-hidden shrink-0"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                  {cat.image_url
                    ? <img src={cat.image_url} className="w-full h-full object-cover" alt={cat.name} />
                    : <div className="w-full h-full flex items-center justify-center text-lg">📁</div>}
                </div>

                {isEditingCat ? (
                  <div className="flex-1 grid grid-cols-2 gap-2">
                    <input value={editCatData.name}
                      onChange={(e) => setEditCatData(p => ({ ...p, name: e.target.value }))}
                      placeholder="Nombre" style={inputStyle} />
                    <input value={editCatData.image_url}
                      onChange={(e) => setEditCatData(p => ({ ...p, image_url: e.target.value }))}
                      placeholder="URL imagen" style={inputStyle} />
                  </div>
                ) : (
                  <div className="flex-1">
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{cat.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                      {subs.length} subcategoria{subs.length !== 1 ? "s" : ""}
                    </div>
                  </div>
                )}

                <div className="flex items-center gap-2 shrink-0">
                  {isEditingCat ? (
                    <>
                      <button onClick={() => saveCat(cat.id)} disabled={savingCat}
                        className="flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                        style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                        <Save className="w-3 h-3" />
                        {savingCat ? "..." : "Guardar"}
                      </button>
                      <button onClick={() => setEditingCat(null)}
                        className="w-7 h-7 flex items-center justify-center rounded-xl cursor-pointer"
                        style={{ backgroundColor: "var(--nomi-gray)" }}>
                        <X className="w-3.5 h-3.5" style={{ color: "var(--nomi-muted)" }} />
                      </button>
                    </>
                  ) : (
                    <button onClick={() => { setEditingCat(cat.id); setEditCatData({ name: cat.name || "", image_url: cat.image_url || "" }); setExpanded(cat.id); }}
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
                    <div className="px-5 py-1">
                      {subs.map((s) => (
                        <div key={s.id} className="flex items-center gap-2 py-2.5"
                          style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                          <span className="w-1.5 h-1.5 rounded-full shrink-0"
                            style={{ backgroundColor: "var(--nomi-teal)" }} />

                          {editingSub === s.id ? (
                            <input
                              value={editSubName}
                              onChange={(e) => setEditSubName(e.target.value)}
                              onKeyDown={(e) => { if (e.key === "Enter") saveSub(s.id); }}
                              className="flex-1 px-3 py-1.5 rounded-lg text-sm outline-none"
                              style={{ border: "1.5px solid var(--nomi-teal)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}
                              autoFocus
                            />
                          ) : (
                            <span className="flex-1 text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>
                              {s.name}
                            </span>
                          )}

                          <div className="flex items-center gap-1.5 shrink-0">
                            {editingSub === s.id ? (
                              <>
                                <button onClick={() => saveSub(s.id)} disabled={savingSub === s.id}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer disabled:opacity-60"
                                  style={{ backgroundColor: "var(--nomi-teal-bg)" }}>
                                  <Save className="w-3.5 h-3.5" style={{ color: "var(--nomi-teal)" }} />
                                </button>
                                <button onClick={() => setEditingSub(null)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                  style={{ backgroundColor: "var(--nomi-gray)" }}>
                                  <X className="w-3.5 h-3.5" style={{ color: "var(--nomi-muted)" }} />
                                </button>
                              </>
                            ) : (
                              <>
                                <button onClick={() => { setEditingSub(s.id); setEditSubName(s.name || ""); }}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                  style={{ backgroundColor: "var(--nomi-orange-bg)" }}>
                                  <Save className="w-3.5 h-3.5" style={{ color: "var(--nomi-orange)" }} />
                                </button>
                                <button onClick={() => deleteSub(s.id, s.name)}
                                  className="w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                                  style={{ backgroundColor: "#FEE2E2" }}>
                                  <Trash2 className="w-3.5 h-3.5" style={{ color: "#DC2626" }} />
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* AGREGAR SUBCATEGORIA */}
                  <div className="px-5 py-3 flex gap-2" style={{ backgroundColor: "var(--nomi-gray)" }}>
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
