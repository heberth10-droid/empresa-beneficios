"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";
import { Trash2 } from "lucide-react";

const IMAGE_BUCKET = "product-images";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [product, setProduct] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState("");
  const [active, setActive] = useState(true);
  const [files, setFiles] = useState<FileList | null>(null);

  const IS = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
    borderRadius: "10px",
    padding: "10px 14px",
    fontSize: "14px",
    outline: "none",
    width: "100%",
  };

  useEffect(() => {
    async function load() {
      const { data: authUser } = await supabase.auth.getUser();
      const user = authUser?.user;
      if (!user) return router.push("/login");

      const { data: userRow } = await supabase.from("users").select("*").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "BRAND_ADMIN") return router.push("/login");

      const { data: brandData } = await supabase.from("brands").select("*").eq("id", userRow.brand_id).single();
      setBrand(brandData);

      const { data: prod } = await supabase.from("products").select("*").eq("id", id).single();
      if (!prod) { alert("Producto no encontrado"); return router.push("/brand/products/list"); }

      setProduct(prod);
      setName(prod.name || "");
      setSku(prod.sku || "");
      setDescription(prod.description || "");
      setPrice(String(prod.price || ""));
      setDiscount(prod.discount_price ? String(prod.discount_price) : "");
      setStock(String(prod.stock || ""));
      setActive(prod.active);

      const { data: varData } = await supabase.from("product_variants").select("*").eq("product_id", id);
      setVariants(varData || []);

      setLoading(false);
    }
    load();
  }, [id, router]);

  async function uploadImages() {
    if (!brand || !product || !files || files.length === 0) return [];
    const urls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36)}.${ext}`;
      const filePath = `${brand.id}/${product.id}/${fileName}`;
      const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(filePath, file, { contentType: file.type, cacheControl: "3600" });
      if (!error) {
        urls.push(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl);
      }
    }
    return urls;
  }

  async function saveChanges() {
    if (!product) return;
    setSaving(true);
    setMsg(null);

    const newImages = await uploadImages();
    const images = newImages.length > 0 ? [...(product.images || []), ...newImages] : (product.images || []);

    const { error } = await supabase.from("products").update({
      name, sku, description,
      price: Number(price),
      discount_price: discount ? Number(discount) : null,
      stock: Number(stock),
      active, images,
    }).eq("id", product.id);

    setSaving(false);

    if (error) { setMsg({ ok: false, text: "Error guardando: " + error.message }); return; }
    setMsg({ ok: true, text: "Producto actualizado correctamente." });
    setProduct({ ...product, images });
    setFiles(null);
    setTimeout(() => router.push("/brand/products/list"), 1200);
  }

  async function removeImage(url: string) {
    if (!product) return;
    const newList = (product.images || []).filter((img: string) => img !== url);
    await supabase.from("products").update({ images: newList }).eq("id", product.id);
    setProduct({ ...product, images: newList });
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">

      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Catalogo</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Editar producto</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>{product.name}</p>
        </div>
        <button onClick={() => router.push("/brand/products/list")}
          className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer shrink-0"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Volver
        </button>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: msg.ok ? "#DCFCE7" : "#FEE2E2", color: msg.ok ? "#16A34A" : "#DC2626" }}>
          {msg.text}
        </div>
      )}

      {/* INFO BASICA */}
      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Informacion basica</p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre *</label>
            <input style={IS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre del producto" />
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>SKU</label>
            <input style={IS} value={sku} onChange={(e) => setSku(e.target.value)} placeholder="SKU" />
          </div>
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
            <textarea style={{ ...IS, resize: "vertical" }} rows={4} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Descripcion del producto" />
          </div>
        </div>
      </div>

      {/* PRECIOS Y STOCK */}
      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Precios y stock</p>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio venta *</label>
            <input style={IS} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" />
            {price && <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-teal)" }}>{money(Number(price))}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio descuento</label>
            <input style={IS} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" />
            {discount && <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-orange)" }}>{money(Number(discount))}</p>}
          </div>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Stock *</label>
            <input style={IS} value={stock} onChange={(e) => setStock(e.target.value)} placeholder="0" />
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer mt-2">
          <div onClick={() => setActive(!active)}
            className="w-10 h-6 rounded-full transition-all relative cursor-pointer"
            style={{ backgroundColor: active ? "var(--nomi-teal)" : "var(--nomi-border)" }}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
              style={{ left: active ? "22px" : "4px" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>
            Producto {active ? "activo" : "inactivo"}
          </span>
        </label>
      </div>

      {/* IMAGENES */}
      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Imagenes</p>

        {product.images && product.images.length > 0 && (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {product.images.map((img: string) => (
              <div key={img} className="relative rounded-xl overflow-hidden"
                style={{ border: "1.5px solid var(--nomi-border)" }}>
                <img src={img} className="w-full h-32 object-cover" alt="producto"
                  onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                <button onClick={() => removeImage(img)}
                  className="absolute top-1.5 right-1.5 w-7 h-7 flex items-center justify-center rounded-full cursor-pointer"
                  style={{ backgroundColor: "#DC2626" }}>
                  <Trash2 className="w-3.5 h-3.5 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}

        <label className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer w-fit"
          style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px dashed var(--nomi-teal)" }}>
          <span className="text-sm font-semibold" style={{ color: "var(--nomi-teal)" }}>+ Agregar imagenes</span>
          <input type="file" multiple accept="image/*" className="hidden"
            onChange={(e) => setFiles(e.target.files)} />
        </label>
        {files && files.length > 0 && (
          <p className="text-xs font-semibold" style={{ color: "var(--nomi-teal)" }}>
            {files.length} archivo(s) seleccionado(s) — se agregaran al guardar
          </p>
        )}
      </div>

      {/* VARIANTES */}
      {variants.length > 0 && (
        <div className="bg-white rounded-2xl p-5 space-y-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Variantes</p>
          <div className="space-y-2">
            {variants.map((v) => (
              <div key={v.id} className="flex items-center justify-between px-4 py-2.5 rounded-xl text-sm"
                style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                <div>
                  <span className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{v.name}: </span>
                  <span style={{ color: "var(--nomi-muted)" }}>{v.value}</span>
                </div>
                <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>
                  Stock: {v.stock}
                  {v.price_delta !== 0 && ` · +${money(v.price_delta)}`}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* GUARDAR */}
      <div className="flex gap-3 pb-6">
        <button onClick={saveChanges} disabled={saving}
          className="flex-1 py-3.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
        <button onClick={() => router.push("/brand/products/list")}
          className="px-6 py-3.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
