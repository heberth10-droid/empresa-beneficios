"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const IMAGE_BUCKET = "product-images";

type MarketCategory = {
  id: string;
  name: string;
  image_url?: string | null;
};

export default function BrandProductsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);

  // Formulario
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

  // Variantes
  const [variants, setVariants] = useState<any[]>([]);
  const [variantName, setVariantName] = useState("");
  const [variantValue, setVariantValue] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantPriceDelta, setVariantPriceDelta] = useState("");

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!userData || userData.role !== "BRAND_ADMIN") {
        router.push("/login");
        return;
      }

      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("id", userData.brand_id)
        .single();

      if (!brandData) {
        router.push("/login");
        return;
      }

      setBrand(brandData);

      await Promise.all([loadProducts(brandData.id), loadCategories()]);

      setLoading(false);
    }

    init();
  }, [router]);

  async function loadProducts(brandId: string) {
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    setProducts(data || []);
  }

  async function loadCategories() {
    const { data, error } = await supabase
      .from("market_categories")
      .select("id,name,image_url")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando categorías:", error);
      setCategories([]);
      return;
    }

    setCategories((data || []) as MarketCategory[]);
  }

  if (loading || !brand) {
    return <div className="p-10 text-slate-300">Cargando panel de productos…</div>;
  }

  async function uploadImages(productId: string) {
    if (!files || files.length === 0) return [];

    const uploadedUrls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36)}.${ext}`;
      const filePath = `${brand.id}/${productId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: "3600",
          upsert: false,
        });

      if (uploadError) {
        console.error("Error al subir imagen:", uploadError);
        continue;
      }

      const publicUrl = supabase.storage
        .from(IMAGE_BUCKET)
        .getPublicUrl(filePath).data.publicUrl;

      uploadedUrls.push(publicUrl);
    }

    return uploadedUrls;
  }

  async function ensureCategory() {
    const cleanNew = newCategory.trim();
    const cleanSelected = category.trim();

    if (cleanNew) {
      const { error } = await supabase.from("market_categories").insert({
        name: cleanNew,
        active: true,
        sort_order: 100,
      });

      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error("No se pudo crear la categoría: " + error.message);
      }

      await loadCategories();
      return cleanNew;
    }

    if (cleanSelected) return cleanSelected;

    throw new Error("Debes seleccionar o crear una categoría.");
  }

  async function handleCreateProduct() {
    try {
      setSaving(true);

      if (!name.trim()) throw new Error("El nombre del producto es obligatorio.");
      if (!price || Number(price) <= 0) throw new Error("El precio debe ser mayor a 0.");
      if (!stock || Number(stock) < 0) throw new Error("El stock es obligatorio.");

      const finalCategory = await ensureCategory();

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          brand_id: brand.id,
          name: name.trim(),
          description: description.trim(),
          category: finalCategory,
          price: Number(price),
          discount_price: discountPrice ? Number(discountPrice) : null,
          sku: sku.trim(),
          stock: Number(stock),
          active: true,
          images: [],
        })
        .select()
        .single();

      if (productError || !newProduct) {
        throw new Error(productError?.message || "Error creando producto");
      }

      const urls = await uploadImages(newProduct.id);

      if (urls.length > 0) {
        await supabase
          .from("products")
          .update({ images: urls })
          .eq("id", newProduct.id);
      }

      for (const v of variants) {
        await supabase.from("product_variants").insert({
          product_id: newProduct.id,
          name: v.name,
          value: v.value,
          stock: Number(v.stock),
          price_delta: Number(v.price_delta),
        });
      }

      setName("");
      setDescription("");
      setCategory("");
      setNewCategory("");
      setPrice("");
      setDiscountPrice("");
      setSku("");
      setStock("");
      setFiles(null);
      setVariants([]);

      await loadProducts(brand.id);
    } catch (e: any) {
      alert(e?.message || "Error creando producto");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  function addVariant() {
    if (!variantName || !variantValue) return;

    setVariants((p) => [
      ...p,
      {
        name: variantName,
        value: variantValue,
        stock: variantStock || 0,
        price_delta: variantPriceDelta || 0,
      },
    ]);

    setVariantName("");
    setVariantValue("");
    setVariantStock("");
    setVariantPriceDelta("");
  }

  return (
    <div className="space-y-12 p-6">
      <div>
        <h1 className="text-3xl font-bold">Productos de {brand.name}</h1>
        <p className="text-slate-400">
          Administra catálogo, categorías, variantes e inventario.
        </p>
      </div>

      <div className="bg-slate-900 p-6 border border-slate-800 rounded-lg">
        <h2 className="text-xl font-semibold mb-4">Crear producto</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            className="p-3 bg-slate-800 rounded"
            placeholder="Nombre del producto"
            value={name}
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="p-3 bg-slate-800 rounded"
            placeholder="SKU"
            value={sku}
            onChange={(e) => setSku(e.target.value)}
          />

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Categoría existente
            </label>
            <select
              className="p-3 bg-slate-800 rounded w-full"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                if (e.target.value) setNewCategory("");
              }}
            >
              <option value="">Seleccionar categoría</option>
              {categories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Crear nueva categoría
            </label>
            <input
              className="p-3 bg-slate-800 rounded w-full"
              placeholder="Ej: Tecnología, Belleza, Suplementos"
              value={newCategory}
              onChange={(e) => {
                setNewCategory(e.target.value);
                if (e.target.value.trim()) setCategory("");
              }}
            />
            <p className="text-xs text-slate-500 mt-1">
              Si escribes una nueva, se usará esta en lugar de la categoría seleccionada.
            </p>
          </div>

          <input
            className="p-3 bg-slate-800 rounded"
            placeholder="Precio"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            className="p-3 bg-slate-800 rounded"
            placeholder="Precio descuento"
            value={discountPrice}
            onChange={(e) => setDiscountPrice(e.target.value)}
          />

          <input
            className="p-3 bg-slate-800 rounded"
            placeholder="Stock"
            value={stock}
            onChange={(e) => setStock(e.target.value)}
          />

          <textarea
            className="p-3 bg-slate-800 rounded col-span-full"
            rows={3}
            placeholder="Descripción del producto"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />

          <div className="col-span-full">
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Imágenes del producto
            </label>

            <button
              type="button"
              onClick={() => document.getElementById("imageUpload")?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm"
            >
              Cargar imágenes
            </button>

            <input
              id="imageUpload"
              type="file"
              multiple
              accept="image/*"
              className="hidden"
              onChange={(e) => setFiles(e.target.files)}
            />

            {files && (
              <p className="text-xs text-emerald-400 mt-2">
                {files.length} archivo(s) seleccionado(s)
              </p>
            )}
          </div>

          <div className="col-span-full">
            <h3 className="text-lg font-semibold mb-2">Variantes</h3>

            <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
              <input
                className="p-3 bg-slate-800 rounded"
                placeholder="Nombre (ej: Talla)"
                value={variantName}
                onChange={(e) => setVariantName(e.target.value)}
              />

              <input
                className="p-3 bg-slate-800 rounded"
                placeholder="Valor (ej: M)"
                value={variantValue}
                onChange={(e) => setVariantValue(e.target.value)}
              />

              <input
                className="p-3 bg-slate-800 rounded"
                placeholder="Stock variante"
                value={variantStock}
                onChange={(e) => setVariantStock(e.target.value)}
              />

              <input
                className="p-3 bg-slate-800 rounded"
                placeholder="Precio adicional"
                value={variantPriceDelta}
                onChange={(e) => setVariantPriceDelta(e.target.value)}
              />
            </div>

            <button
              type="button"
              onClick={addVariant}
              className="mt-3 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-black rounded"
            >
              Agregar variante
            </button>

            {variants.length > 0 && (
              <div className="mt-3 space-y-2">
                {variants.map((v, i) => (
                  <div
                    key={i}
                    className="bg-slate-800 p-3 rounded border border-slate-700"
                  >
                    {v.name}: {v.value} — Stock {v.stock}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleCreateProduct}
          disabled={saving}
          className="mt-6 px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear producto"}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {products.map((p) => (
          <div
            key={p.id}
            className="bg-slate-900 border border-slate-800 p-4 rounded-lg"
          >
            {p.images && p.images.length > 0 && (
              <img
                src={p.images[0]}
                className="w-full h-40 object-cover rounded mb-3"
                alt={p.name}
              />
            )}

            <a
              href={`/brand/products/${p.id}`}
              className="text-lg font-bold hover:text-emerald-400 transition"
            >
              {p.name}
            </a>

            <p className="text-sm text-slate-400">{p.sku}</p>

            {p.category && (
              <p className="text-xs text-slate-500 mt-1">
                Categoría: {p.category}
              </p>
            )}

            <p className="text-emerald-400 text-lg font-bold mt-2">
              ${Number(p.price || 0).toLocaleString("es-CO")}
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}