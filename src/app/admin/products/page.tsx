"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Package, X, Save, Upload, Trash2 } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

const IMAGE_BUCKET = "product-images";

export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [brandMap, setBrandMap] = useState<Record<string, string>>({});
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState<any | null>(null);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [saveMsg, setSaveMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [form, setForm] = useState({
    name: "", description: "", price: "", discount_price: "",
    stock: "", category: "", subcategory: "", active: true,
  });
  const [currentImages, setCurrentImages] = useState<string[]>([]);
  const [newImageUrl, setNewImageUrl] = useState("");

  async function load() {
    const { data: products } = await supabase
      .from("products")
      .select("id, name, description, price, discount_price, stock, active, category, subcategory, images, image_url, created_at, product_brand_id")
      .order("created_at", { ascending: false });

    const brandIds = [...new Set((products || []).map((p: any) => p.product_brand_id).filter(Boolean))];
    let bmap: Record<string, string> = {};
    if (brandIds.length > 0) {
      const { data: brands } = await supabase
        .from("product_brands")
        .select("id, name")
        .in("id", brandIds);
      for (const b of brands || []) bmap[b.id] = b.name || b.id;
    }

    setRows(products || []);
    setBrandMap(bmap);
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((p: any) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (brandMap[p.product_brand_id] || "").toLowerCase().includes(q)
    );
  }, [rows, search, brandMap]);

  function parseImages(p: any): string[] {
    if (Array.isArray(p.images)) return p.images.filter((x: any) => typeof x === "string" && x.startsWith("http"));
    if (typeof p.images === "string" && p.images.trim()) {
      try { const a = JSON.parse(p.images); if (Array.isArray(a)) return a.filter((x: any) => typeof x === "string"); } catch {}
      if (p.images.startsWith("http")) return [p.images];
    }
    if (p.image_url && typeof p.image_url === "string") return [p.image_url];
    return [];
  }

  function openEdit(p: any) {
    setEditing(p);
    setCurrentImages(parseImages(p));
    setNewImageUrl("");
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

  async function uploadImageFile(file: File): Promise<string | null> {
    setUploading(true);
    const ext = file.name.split(".").pop();
    const path = `admin/${editing.id}/${Date.now()}.${ext}`;
    const { error } = await supabase.storage
      .from(IMAGE_BUCKET)
      .upload(path, file, { contentType: file.type, cacheControl: "3600", upsert: true });
    setUploading(false);
    if (error) { setSaveMsg({ ok: false, text: "Error subiendo imagen: " + error.message }); return null; }
    return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(path).data.publicUrl;
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = await uploadImageFile(file);
    if (url) setCurrentImages(prev => [...prev, url]);
  }

  function addImageByUrl() {
    const url = newImageUrl.trim();
    if (!url || !url.startsWith("http")) return;
    setCurrentImages(prev => [...prev, url]);
    setNewImageUrl("");
  }

  function removeImage(url: string) {
    setCurrentImages(prev => prev.filter(u => u !== url));
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
        images: currentImages,
        image_url: currentImages[0] || null,
      })
      .eq("id", editing.id);
    setSaving(false);
    if (error) {
      setSaveMsg({ ok: false, text: "Error: " + error.message });
    } else {
      setSaveMsg({ ok: true, text: "Producto actualizado correctamente" });
      load();
      setTimeout(() => { setEditing(null); setSaveMsg(null); }, 1500);
    }
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
          <span>Descuento</span>
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
        ) : filtered.map((p: any) => {
          const price = Number(p.price || 0);
          const disc = Number(p.discount_price || 0);
          const imgs = parseImages(p);
          const img = imgs[0] || null;
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
                {brandMap[p.product_brand_id] || "—"}
              </div>
              <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                {money(price)}
              </div>
              <div className="text-sm" style={{ color: disc > 0 ? "#16A34A" : "var(--nomi-muted)" }}>
                {disc > 0 ? money(disc) : "—"}
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
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[92vh] overflow-y-auto"
            style={{ border: "1.5px solid var(--nomi-border)" }}
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10"
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

            <div className="px-6 py-5 space-y-5">

              {/* IMAGENES */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{ color: "var(--nomi-teal)" }}>Imagenes</p>

                {currentImages.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {currentImages.map((url, i) => (
                      <div key={i} className="relative group rounded-xl overflow-hidden"
                        style={{ aspectRatio: "1", backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                        <img src={url} className="w-full h-full object-cover"
                          onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
                        <button onClick={() => removeImage(url)}
                          className="absolute top-1 right-1 w-6 h-6 flex items-center justify-center rounded-full opacity-0 group-hover:opacity-100 transition cursor-pointer"
                          style={{ backgroundColor: "#DC2626" }}>
                          <Trash2 className="w-3 h-3 text-white" />
                        </button>
                        {i === 0 && (
                          <div className="absolute bottom-1 left-1 text-xs px-1.5 py-0.5 rounded-md font-bold"
                            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                            Principal
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                )}

                <label className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer mb-2"
                  style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px dashed var(--nomi-teal)" }}>
                  <Upload className="w-4 h-4 shrink-0" style={{ color: "var(--nomi-teal)" }} />
                  <span className="text-sm font-semibold" style={{ color: "var(--nomi-teal)" }}>
                    {uploading ? "Subiendo..." : "Subir imagen desde tu dispositivo"}
                  </span>
                  <input type="file" accept="image/*" className="hidden"
                    onChange={handleFileChange} disabled={uploading} />
                </label>

                <div className="flex gap-2">
                  <input value={newImageUrl} onChange={(e) => setNewImageUrl(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") addImageByUrl(); }}
                    placeholder="O pega una URL https://..."
                    className={inputClass} style={inputStyle} />
                  <button onClick={addImageByUrl}
                    className="px-4 rounded-xl text-xs font-bold cursor-pointer whitespace-nowrap"
                    style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
                    Agregar
                  </button>
                </div>
              </div>

              {/* CAMPOS */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{ color: "var(--nomi-teal)" }}>Informacion</p>
                <div className="space-y-3">
                  {[
                    { label: "Nombre", key: "name", type: "text" },
                    { label: "Precio", key: "price", type: "number" },
                    { label: "Precio con descuento", key: "discount_price", type: "number" },
                    { label: "Stock", key: "stock", type: "number" },
                    { label: "Categoria", key: "category", type: "text" },
                    { label: "Subcategoria", key: "subcategory", type: "text" },
                  ].map(({ label, key, type }) => (
                    <div key={key}>
                      <label className="block text-xs font-bold mb-1 uppercase tracking-wide"
                        style={{ color: "var(--nomi-navy)" }}>{label}</label>
                      <input type={type} value={(form as any)[key]}
                        onChange={(e) => setForm((f: any) => ({ ...f, [key]: e.target.value }))}
                        className={inputClass} style={inputStyle} />
                    </div>
                  ))}

                  <div>
                    <label className="block text-xs font-bold mb-1 uppercase tracking-wide"
                      style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
                    <textarea rows={3} value={form.description}
                      onChange={(e) => setForm((f: any) => ({ ...f, description: e.target.value }))}
                      className={inputClass} style={{ ...inputStyle, resize: "vertical" as const }} />
                  </div>

                  <div className="flex items-center gap-3 pt-1">
                    <input type="checkbox" id="pactive" checked={form.active}
                      onChange={(e) => setForm((f: any) => ({ ...f, active: e.target.checked }))}
                      className="w-4 h-4 cursor-pointer" />
                    <label htmlFor="pactive" className="text-sm font-semibold cursor-pointer"
                      style={{ color: "var(--nomi-navy)" }}>
                      Activo (visible en tienda)
                    </label>
                  </div>
                </div>
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
              <button onClick={saveProduct} disabled={saving || uploading}
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
