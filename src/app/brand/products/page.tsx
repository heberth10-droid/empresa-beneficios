"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

const IMAGE_BUCKET = "product-images";

type MarketCategory = {
  id: string;
  name: string;
};

type MarketSubcategory = {
  id: string;
  category_name: string;
  name: string;
};

type ProductBrand = {
  id: string;
  name: string;
};

export default function BrandProductsPage() {
  const router = useRouter();

  const [brand, setBrand] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);

  // FORM
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");

  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");

  const [subcategory, setSubcategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");

  const [productBrandId, setProductBrandId] = useState("");

  const [price, setPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [stock, setStock] = useState("");

  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

  const selectedCategoryName = newCategory || category;

  const filteredSubcategories = useMemo(() => {
    return subcategories.filter(
      (s) =>
        s.category_name.toLowerCase() ===
        selectedCategoryName.toLowerCase()
    );
  }, [subcategories, selectedCategoryName]);

  useEffect(() => {
    async function init() {
      const { data: auth } = await supabase.auth.getUser();
      if (!auth.user) return router.push("/login");

      const { data: user } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", auth.user.id)
        .single();

      const { data: brand } = await supabase
        .from("brands")
        .select("*")
        .eq("id", user.brand_id)
        .single();

      setBrand(brand);

      await Promise.all([
        loadCategories(),
        loadSubcategories(),
        loadProductBrands(brand.id),
      ]);

      setLoading(false);
    }

    init();
  }, []);

  async function loadCategories() {
    const { data } = await supabase
      .from("market_categories")
      .select("*");

    setCategories(data || []);
  }

  async function loadSubcategories() {
    const { data } = await supabase
      .from("market_subcategories")
      .select("*");

    setSubcategories(data || []);
  }

  async function loadProductBrands(brandId: string) {
    const { data } = await supabase
      .from("product_brands")
      .select("id,name")
      .eq("seller_brand_id", brandId)
      .eq("active", true);

    setProductBrands(data || []);
  }

  async function uploadImages(productId: string) {
    if (!files) return [];

    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random()}.${ext}`;

      const path = `${brand.id}/${productId}/${fileName}`;

      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(path, file);

      if (!error) {
        const url = supabase.storage
          .from(IMAGE_BUCKET)
          .getPublicUrl(path).data.publicUrl;

        urls.push(url);
      }
    }

    return urls;
  }

  async function ensureCategory() {
    if (newCategory) {
      await supabase.from("market_categories").insert({
        name: newCategory,
        active: true,
      });

      return newCategory;
    }

    return category;
  }

  async function ensureSubcategory(finalCategory: string) {
    if (newSubcategory) {
      await supabase.from("market_subcategories").insert({
        category_name: finalCategory,
        name: newSubcategory,
        active: true,
      });

      return newSubcategory;
    }

    return subcategory;
  }

  async function handleCreateProduct() {
    try {
      setSaving(true);

      if (!productBrandId) throw new Error("Selecciona una marca");

      const finalCategory = await ensureCategory();
      const finalSubcategory = await ensureSubcategory(finalCategory);

      const { data: product } = await supabase
        .from("products")
        .insert({
          brand_id: brand.id,
          product_brand_id: productBrandId,
          name,
          sku,
          description,
          category: finalCategory,
          subcategory: finalSubcategory,
          price: Number(price),
          discount_price: discountPrice ? Number(discountPrice) : null,
          stock: Number(stock),
          active: true,
          images: [],
        })
        .select()
        .single();

      const imgs = await uploadImages(product.id);

      if (imgs.length > 0) {
        await supabase
          .from("products")
          .update({ images: imgs })
          .eq("id", product.id);
      }

      alert("Producto creado");

      // reset
      setName("");
      setSku("");
      setDescription("");
      setCategory("");
      setSubcategory("");
      setNewCategory("");
      setNewSubcategory("");
      setProductBrandId("");
      setPrice("");
      setStock("");

    } catch (e: any) {
      alert(e.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="p-10">Cargando…</div>;

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold">Crear producto</h1>

      <div className="grid grid-cols-2 gap-6">

        <input
          placeholder="Nombre"
          className="p-3 bg-slate-800 rounded"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />

        <input
          placeholder="SKU"
          className="p-3 bg-slate-800 rounded"
          value={sku}
          onChange={(e) => setSku(e.target.value)}
        />

        {/* MARCA */}
        <select
          className="p-3 bg-slate-800 rounded"
          value={productBrandId}
          onChange={(e) => setProductBrandId(e.target.value)}
        >
          <option value="">Seleccionar marca</option>
          {productBrands.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name}
            </option>
          ))}
        </select>

        {/* CATEGORIA */}
        <select
          className="p-3 bg-slate-800 rounded"
          value={category}
          onChange={(e) => {
            setCategory(e.target.value);
            setSubcategory("");
          }}
        >
          <option value="">Categoría</option>
          {categories.map((c) => (
            <option key={c.id}>{c.name}</option>
          ))}
        </select>

        <input
          placeholder="Nueva categoría"
          className="p-3 bg-slate-800 rounded"
          value={newCategory}
          onChange={(e) => setNewCategory(e.target.value)}
        />

        {/* SUBCATEGORIA */}
        <select
          className="p-3 bg-slate-800 rounded"
          value={subcategory}
          onChange={(e) => setSubcategory(e.target.value)}
        >
          <option value="">Subcategoría</option>
          {filteredSubcategories.map((s) => (
            <option key={s.id}>{s.name}</option>
          ))}
        </select>

        <input
          placeholder="Nueva subcategoría"
          className="p-3 bg-slate-800 rounded"
          value={newSubcategory}
          onChange={(e) => setNewSubcategory(e.target.value)}
        />

        <input
          placeholder="Precio"
          className="p-3 bg-slate-800 rounded"
          value={price}
          onChange={(e) => setPrice(e.target.value)}
        />

        <input
          placeholder="Stock"
          className="p-3 bg-slate-800 rounded"
          value={stock}
          onChange={(e) => setStock(e.target.value)}
        />
      </div>

      <textarea
        className="w-full p-3 bg-slate-800 rounded"
        placeholder="Descripción"
        value={description}
        onChange={(e) => setDescription(e.target.value)}
      />

      <input
        type="file"
        multiple
        onChange={(e) => setFiles(e.target.files)}
      />

      <button
        onClick={handleCreateProduct}
        className="bg-emerald-500 px-6 py-3 rounded text-black font-bold"
      >
        Crear producto
      </button>
    </div>
  );
}