"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Upload, Save, X, Tag } from "lucide-react";

const BRAND_LOGO_BUCKET = "product-brand-logos";

export default function ProductBrandsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [productBrands, setProductBrands] = useState<any[]>([]);
  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingName, setEditingName] = useState("");
  const [editingLogoFile, setEditingLogoFile] = useState<File | null>(null);
  const [editingPreviewLogo, setEditingPreviewLogo] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userData } = await supabase.from("users").select("*").eq("auth_id", user.id).single();
      if (!userData || userData.role !== "BRAND_ADMIN") { router.push("/login"); return; }

      const { data: brandData } = await supabase.from("brands").select("*").eq("id", userData.brand_id).single();
      if (!brandData) { router.push("/login"); return; }

      setBrand(brandData);
      await loadProductBrands(brandData.id);
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadProductBrands(brandId: string) {
    const { data } = await supabase.from("product_brands").select("*")
      .eq("seller_brand_id", brandId).eq("active", true).order("name", { ascending: true });
    setProductBrands(data || []);
  }

  async function uploadLogo(productBrandId: string, file: File) {
    const ext = file.name.split(".").pop();
    const filePath = `${brand.id}/${productBrandId}/${Date.now()}-${Math.random().toString(36)}.${ext}`;
    const { error } = await supabase.storage.from(BRAND_LOGO_BUCKET)
      .upload(filePath, file, { contentType: file.type, cacheControl: "3600", upsert: true });
    if (error) throw new Error("No se pudo subir el logo: " + error.message);
    return supabase.storage.from(BRAND_LOGO_BUCKET).getPublicUrl(filePath).data.publicUrl;
  }

  async function handleCreateBrand() {
    try {
      setSaving(true);
      const cleanName = name.trim();
      if (!cleanName) throw new Error("Debes escribir el nombre de la marca.");
      if (productBrands.find(b => b.name.trim().toLowerCase() === cleanName.toLowerCase()))
        throw new Error("Esta marca ya existe.");

      const { data: created, error } = await supabase.from("product_brands")
        .insert({ seller_brand_id: brand.id, name: cleanName, logo_url: null, active: true })
        .select().single();
      if (error || !created) throw new Error("No se pudo crear la marca: " + (error?.message || ""));

      if (logoFile) {
        const logoUrl = await uploadLogo(created.id, logoFile);
        await supabase.from("product_brands").update({ logo_url: logoUrl }).eq("id", created.id);
      }

      setName(""); setLogoFile(null); setPreviewLogo(null);
      await loadProductBrands(brand.id);
    } catch (e: any) {
      alert(e?.message || "Error creando la marca.");
    } finally { setSaving(false); }
  }

  function startEdit(b: any) {
    setEditingId(b.id); setEditingName(b.name || "");
    setEditingLogoFile(null); setEditingPreviewLogo(b.logo_url || null);
  }

  function cancelEdit() {
    setEditingId(null); setEditingName(""); setEditingLogoFile(null); setEditingPreviewLogo(null);
  }

  async function handleUpdateBrand() {
    try {
      if (!editingId) return;
      setUpdating(true);
      const cleanName = editingName.trim();
      if (!cleanName) throw new Error("Debes escribir el nombre.");
      if (productBrands.find(b => b.id !== editingId && b.name.trim().toLowerCase() === cleanName.toLowerCase()))
        throw new Error("Ya existe otra marca con ese nombre.");

      let logoUrl = editingPreviewLogo;
      if (editingLogoFile) logoUrl = await uploadLogo(editingId, editingLogoFile);

      const { error } = await supabase.from("product_brands")
        .update({ name: cleanName, logo_url: logoUrl || null })
        .eq("id", editingId).eq("seller_brand_id", brand.id);
      if (error) throw new Error("No se pudo actualizar: " + error.message);

      cancelEdit();
      await loadProductBrands(brand.id);
    } catch (e: any) {
      alert(e?.message || "Error actualizando la marca.");
    } finally { setUpdating(false); }
  }

  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
    borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%",
  };

  if (loading || !brand) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Catalogo</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Marcas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Crea las marcas que luego podras seleccionar al crear productos
        </p>
      </div>

      {/* CREAR MARCA */}
      <div className="bg-white rounded-2xl p-6 space-y-5"
        style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div>
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
            Crear nueva marca
          </h2>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            Las marcas con logo aparecen con imagen en el marketplace
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>Nombre de la marca *</label>
            <input style={inputStyle} placeholder="Ej: Samsung, Apple, Adidas"
              value={name} onChange={(e) => setName(e.target.value)} />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>Logo (opcional)</label>
            <label className="flex items-center gap-3 px-4 py-2.5 rounded-xl cursor-pointer"
              style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px dashed var(--nomi-teal)" }}>
              <Upload className="w-4 h-4 shrink-0" style={{ color: "var(--nomi-teal)" }} />
              <span className="text-sm font-semibold" style={{ color: "var(--nomi-teal)" }}>
                Subir logo PNG/JPG
              </span>
              <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0] || null;
                  setLogoFile(file);
                  setPreviewLogo(file ? URL.createObjectURL(file) : null);
                }} />
            </label>
            <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>
              Ideal: PNG sin fondo o logo con fondo blanco
            </p>
            {previewLogo && (
              <div className="mt-3 p-3 rounded-xl inline-block" style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                <img src={previewLogo} alt="Preview" className="h-12 object-contain" />
              </div>
            )}
          </div>
        </div>

        <button onClick={handleCreateBrand} disabled={saving || !name.trim()}
          className="px-6 py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {saving ? "Creando..." : "Crear marca"}
        </button>
      </div>

      {/* LISTA DE MARCAS */}
      <div>
        <h2 className="font-black text-base mb-4" style={{ color: "var(--nomi-navy)" }}>
          Mis marcas ({productBrands.length})
        </h2>

        {productBrands.length === 0 ? (
          <div className="bg-white rounded-2xl px-5 py-10 text-center"
            style={{ border: "1.5px solid var(--nomi-border)" }}>
            <Tag className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>
              Aun no tienes marcas creadas
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
            {productBrands.map((b) => {
              const isEditing = editingId === b.id;
              return (
                <div key={b.id} className="bg-white rounded-2xl overflow-hidden"
                  style={{ border: "1.5px solid var(--nomi-border)" }}>
                  {/* LOGO */}
                  <div className="h-24 flex items-center justify-center p-4"
                    style={{ backgroundColor: "var(--nomi-gray)" }}>
                    {(isEditing ? editingPreviewLogo : b.logo_url) ? (
                      <img src={isEditing ? editingPreviewLogo! : b.logo_url}
                        alt={b.name} className="max-h-16 object-contain" />
                    ) : (
                      <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white"
                        style={{ backgroundColor: "var(--nomi-navy)" }}>
                        {(b.name || "M").charAt(0).toUpperCase()}
                      </div>
                    )}
                  </div>

                  <div className="p-4 space-y-3">
                    {isEditing ? (
                      <>
                        <input value={editingName} onChange={(e) => setEditingName(e.target.value)}
                          placeholder="Nombre"
                          className="w-full px-3 py-2 rounded-xl text-sm outline-none"
                          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }} />
                        <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold"
                          style={{ color: "var(--nomi-teal)" }}>
                          <Upload className="w-3.5 h-3.5" />
                          Cambiar logo
                          <input type="file" accept="image/png,image/jpeg,image/webp" className="hidden"
                            onChange={(e) => {
                              const file = e.target.files?.[0] || null;
                              setEditingLogoFile(file);
                              if (file) setEditingPreviewLogo(URL.createObjectURL(file));
                            }} />
                        </label>
                        <div className="flex gap-2">
                          <button onClick={handleUpdateBrand} disabled={updating}
                            className="flex-1 flex items-center justify-center gap-1 py-2 rounded-xl text-xs font-bold cursor-pointer disabled:opacity-60"
                            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                            <Save className="w-3.5 h-3.5" />
                            {updating ? "..." : "Guardar"}
                          </button>
                          <button onClick={cancelEdit} disabled={updating}
                            className="px-3 py-2 rounded-xl cursor-pointer"
                            style={{ backgroundColor: "var(--nomi-gray)", border: "1.5px solid var(--nomi-border)" }}>
                            <X className="w-3.5 h-3.5" style={{ color: "var(--nomi-muted)" }} />
                          </button>
                        </div>
                      </>
                    ) : (
                      <>
                        <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                          {b.name}
                        </div>
                        <button onClick={() => startEdit(b)}
                          className="w-full py-2 rounded-xl text-xs font-bold cursor-pointer"
                          style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1px solid rgba(245,166,35,0.3)" }}>
                          Editar
                        </button>
                      </>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
