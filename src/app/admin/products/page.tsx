"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Package, X, Save } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", discount_price: "",
    stock: "", category: "", subcategory: "", active: true,
  });

  async function load() {
    const { data } = await supabase
      .from("products")
      .select("id, name, description, price, discount_price, stock, active, category, subcategory, images, image_url, created_at, product_brand_id, product_brands(name)")
      .order("created_at", { ascending: false });
    setRows(data || []);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      ((p.product_brands as any)?.name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  function openEdit(p: any) {
    setEditing(p);
    setForm({
      name: p.name || "",
      description: p.description || "",
      price: String(p.price || ""),
      discount_price: String(p.discount_price || ""),
      stock: String(p.stock || ""),
      category: p.category || "",
      subcategory: p.subcategory || "",
      active: p.active !== false,
    });
    setSaveMsg(null);
  }

  async function saveProduct() {
    if (!editing) return;
    setSaving(true);
    const { error } = await supabase
      .from("products")
      .update({
        name: form.name.trim(),
        description: form.description.trim(),
        price: Number(form.price) || 0,
        discount_price: form.discount_price ? Number(form.discount_price) : null,
        stock: Number(form.stock) || 0,
        category: form.category.trim(),
        subcategory: form.subcategory.trim(),
        active: form.active,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      setSaveMsg({ ok: false, text: "Error: " + error.message });
    } else {
      setSaveMsg({ ok: true, text: "Producto actualizado" });
      load();
      setTimeout(() => { setEditing(null); setSaveMsg(null); }, 1500);
    }
  }

  function getImg(p: any) {
    if (p.image_url) return p.image_url;
    if (Array.isArray(p.images) && p.images[0]) return p.images[0];
    if (typeof p.images === "string") {
      try { const a = JSON.parse(p.images); if (a[0]) return a[0]; } catch {}
    }
    return null;
  }

  const inputClass = "w-full px-3 py-2.5 rounded-xl text-sm outline-none";
  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Productos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {filtered.length} de {rows.length} productos · clic para editar
        </p>
      </div>

      <input type="text" placeholder="Buscar por nombre, categoria o marca..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }} />

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-6 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Producto</span>
          <span>Marca</span>
          <span>Precio</span>
          <span>Margen</span>
          <span className="text-right">Stock</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>No se encontraron productos</p>
          </div>
        ) : filtered.map((p) => {
          const price = Number(p.price || 0);
          const disc = Number(p.discount_price || 0);
          const img = getImg(p);
          const margin = price > 0 && disc > 0 ? ((price - disc) / price) * 100 : 0;

          return (
            <div key={p.id}
              className="grid grid-cols-6 px-5 py-3.5 items-center transition hover:bg-slate-50 cursor-pointer"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}
              onClick={() => openEdit(p)}>
              <div className="col-span-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                  {img
                    ? <img src={img} className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>}
                </div>
                <div>
                  <div className="font-bold text-sm truncate max-w-[160px]" style={{ color: "var(--nomi-navy)" }}>
                    {p.name || "Producto"}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                    {p.category || "Sin categoria"}
                  </div>
                </div>
              </div>
              <div className="text-sm truncate" style={{ color: "var(--nomi-muted)" }}>
                {(p.product_brands as any)?.name || "—"}
              </div>
              <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                {money(price)}
              </div>
              <div>
                {disc > 0 && disc < price ? (
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
                    {margin.toFixed(1)}%
                  </span>
                ) : <span style={{ color: "var(--nomi-muted)" }}>—</span>}
              </div>
              <div className="text-right">
                <span className="text-sm font-bold"
                  style={{ color: Number(p.stock || 0) > 0 ? "var(--nomi-teal)" : "#DC2626" }}>
                  {p.stock || 0}
                </span>
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL EDICION */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setEditing(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ border: "1.5px solid var(--nomi-border)" }}
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
                Editar producto
              </h2>
              <button onClick={() => setEditing(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                style={{ backgroundColor: "var(--nomi-gray)" }}>
                <X className="w-4 h-4" style={{ color: "var(--nomi-muted)" }} />
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {[
                { label: "Nombre", key: "name", type: "text" },
                { label: "Precio", key: "price", type: "number" },
                { label: "Precio con descuento", key: "discount_price", type: "number" },
                { label: "Stock", key: "stock", type: "number" },
                { label: "Categoria", key: "category", type: "text" },
                { label: "Subcategoria", key: "subcategory", type: "text" },
              ].map(({ label, key, type }) => (
                <div key={key}>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--nomi-navy)" }}>{label}</label>
                  <input
                    type={type}
                    value={(form as any)[key]}
                    onChange={(e) => setForm(f => ({ ...f, [key]: e.target.value }))}
                    className={inputClass} style={inputStyle}
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm(f => ({ ...f, description: e.target.value }))}
                  className={inputClass} style={{ ...inputStyle, resize: "vertical" as const }}
                />
              </div>

              <div className="flex items-center gap-3">
                <input type="checkbox" id="active-check" checked={form.active}
                  onChange={(e) => setForm(f => ({ ...f, active: e.target.checked }))}
                  className="w-4 h-4 cursor-pointer" />
                <label htmlFor="active-check" className="text-sm font-semibold cursor-pointer"
                  style={{ color: "var(--nomi-navy)" }}>
                  Producto activo (visible en tienda)
                </label>
              </div>

              {saveMsg && (
                <div className="px-4 py-3 rounded-xl text-sm font-semibold"
                  style={saveMsg.ok
                    ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
                    : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                  {saveMsg.text}
                </div>
              )}
            </div>

            <div className="px-6 pb-6 flex gap-3">
              <button onClick={saveProduct} disabled={saving}
                className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                <Save className="w-4 h-4" />
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button onClick={() => setEditing(null)}
                className="px-4 py-3 rounded-xl text-sm font-bold cursor-pointer"
                style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                Cancelar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
