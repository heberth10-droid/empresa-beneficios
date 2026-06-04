"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Papa from "papaparse";

const IMAGE_BUCKET = "product-images";

type MarketCategory = {
  id: string;
  name: string;
  image_url?: string | null;
};

type MarketSubcategory = {
  id: string;
  category_name: string;
  name: string;
};

type ProductBrand = {
  id: string;
  seller_brand_id: string;
  name: string;
  logo_url: string | null;
  active: boolean;
};

type BulkProductRow = {
  rowNumber: number;
  name: string;
  sku: string;
  category: string;
  subcategory: string;
  product_brand: string;
  product_brand_logo_url: string;
  price: number;
  cost_price: number | null;
  stock: number;
  description: string;
  images: string[];
  discount_price: number | null;
  errors: string[];
};

const REQUIRED_COLUMNS = [
  "name","sku","category","subcategory","product_brand",
  "price","cost_price","stock","description","images",
];

function normalizeHeader(value: string) {
  return String(value || "").trim().toLowerCase();
}

function parseImages(value: any): string[] {
  const raw = String(value || "").trim();
  if (!raw) return [];
  return raw.split(",").map((x) => x.trim()).filter(Boolean);
}

function parseMoney(value: any) {
  const raw = String(value || "").replaceAll("$","").replaceAll(".","").replaceAll(",",".").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(value || 0));
}

function calculateMargin(priceValue: string, costValue: string) {
  const p = Number(priceValue || 0);
  const c = Number(costValue || 0);
  if (!p || !c || p <= 0 || c < 0) return null;
  return ((p - c) / p) * 100;
}

export default function BrandProductsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [categories, setCategories] = useState<MarketCategory[]>([]);
  const [subcategories, setSubcategories] = useState<MarketSubcategory[]>([]);
  const [productBrands, setProductBrands] = useState<ProductBrand[]>([]);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [category, setCategory] = useState("");
  const [newCategory, setNewCategory] = useState("");
  const [subcategory, setSubcategory] = useState("");
  const [newSubcategory, setNewSubcategory] = useState("");
  const [productBrandId, setProductBrandId] = useState("");
  const [newProductBrandName, setNewProductBrandName] = useState("");
  const [price, setPrice] = useState("");
  const [costPrice, setCostPrice] = useState("");
  const [discountPrice, setDiscountPrice] = useState("");
  const [sku, setSku] = useState("");
  const [stock, setStock] = useState("");
  const [files, setFiles] = useState<FileList | null>(null);
  const [saving, setSaving] = useState(false);

  const [variants, setVariants] = useState<any[]>([]);
  const [variantName, setVariantName] = useState("");
  const [variantValue, setVariantValue] = useState("");
  const [variantStock, setVariantStock] = useState("");
  const [variantPriceDelta, setVariantPriceDelta] = useState("");

  const [bulkRows, setBulkRows] = useState<BulkProductRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const selectedCategoryName = newCategory.trim() || category.trim();
  const manualMargin = useMemo(() => calculateMargin(price, costPrice), [price, costPrice]);
  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryName) return [];
    return subcategories.filter(
      (s) => s.category_name.trim().toLowerCase() === selectedCategoryName.trim().toLowerCase()
    );
  }, [subcategories, selectedCategoryName]);

  const bulkValidRows = useMemo(() => bulkRows.filter((r) => r.errors.length === 0), [bulkRows]);
  const bulkInvalidRows = useMemo(() => bulkRows.filter((r) => r.errors.length > 0), [bulkRows]);

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
      await Promise.all([loadCategories(), loadSubcategories(), loadProductBrands(brandData.id)]);
      setLoading(false);
    }
    init();
  }, [router]);

  async function loadCategories() {
    const { data, error } = await supabase.from("market_categories").select("id,name,image_url")
      .eq("active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });
    if (error) { setCategories([]); return; }
    setCategories((data || []) as MarketCategory[]);
  }

  async function loadSubcategories() {
    const { data, error } = await supabase.from("market_subcategories").select("id,category_name,name")
      .eq("active", true).order("sort_order", { ascending: true }).order("name", { ascending: true });
    if (error) { setSubcategories([]); return; }
    setSubcategories((data || []) as MarketSubcategory[]);
  }

  async function loadProductBrands(brandId: string) {
    const { data, error } = await supabase.from("product_brands").select("id,seller_brand_id,name,logo_url,active")
      .eq("seller_brand_id", brandId).eq("active", true).order("name", { ascending: true });
    if (error) { setProductBrands([]); return; }
    setProductBrands((data || []) as ProductBrand[]);
  }

  async function uploadImages(productId: string) {
    if (!files || files.length === 0) return [];
    const uploadedUrls: string[] = [];
    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36)}.${ext}`;
      const filePath = `${brand.id}/${productId}/${fileName}`;
      const { error: uploadError } = await supabase.storage.from(IMAGE_BUCKET)
        .upload(filePath, file, { contentType: file.type, cacheControl: "3600", upsert: false });
      if (uploadError) continue;
      uploadedUrls.push(supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl);
    }
    return uploadedUrls;
  }

  async function ensureCategory() {
    const cleanNew = newCategory.trim();
    const cleanSelected = category.trim();
    if (cleanNew) {
      const { error } = await supabase.from("market_categories").insert({ name: cleanNew, active: true, sort_order: 100 });
      if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error("No se pudo crear la categoria: " + error.message);
      await loadCategories();
      return cleanNew;
    }
    if (cleanSelected) return cleanSelected;
    throw new Error("Debes seleccionar o crear una categoria.");
  }

  async function ensureSubcategory(finalCategory: string) {
    const cleanNew = newSubcategory.trim();
    const cleanSelected = subcategory.trim();
    if (cleanNew) {
      const { error } = await supabase.from("market_subcategories").insert({ category_name: finalCategory, name: cleanNew, active: true, sort_order: 100 });
      if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error("No se pudo crear la subcategoria: " + error.message);
      await loadSubcategories();
      return cleanNew;
    }
    if (cleanSelected) return cleanSelected;
    return null;
  }

  async function ensureProductBrand() {
    const cleanNew = newProductBrandName.trim();
    const selected = productBrandId.trim();
    if (cleanNew) {
      const existing = productBrands.find((b) => b.name.trim().toLowerCase() === cleanNew.toLowerCase());
      if (existing) return existing.id;
      const { data: createdBrand, error } = await supabase.from("product_brands")
        .insert({ seller_brand_id: brand.id, name: cleanNew, active: true, logo_url: null }).select().single();
      if (error || !createdBrand) throw new Error("No se pudo crear la marca: " + (error?.message || ""));
      await loadProductBrands(brand.id);
      return createdBrand.id;
    }
    if (selected) return selected;
    throw new Error("Debes seleccionar o crear la marca del producto.");
  }

  async function handleCreateProduct() {
    try {
      setSaving(true);
      if (!name.trim()) throw new Error("El nombre del producto es obligatorio.");
      if (!price || Number(price) <= 0) throw new Error("El precio debe ser mayor a 0.");
      if (costPrice && Number(costPrice) < 0) throw new Error("El costo no puede ser negativo.");
      if (!stock || Number(stock) < 0) throw new Error("El stock es obligatorio.");

      const finalCategory = await ensureCategory();
      const finalSubcategory = await ensureSubcategory(finalCategory);
      const finalProductBrandId = await ensureProductBrand();

      const { data: newProduct, error: productError } = await supabase.from("products").insert({
        brand_id: brand.id, product_brand_id: finalProductBrandId, name: name.trim(),
        description: description.trim(), category: finalCategory, subcategory: finalSubcategory,
        price: Number(price), cost_price: costPrice ? Number(costPrice) : null,
        discount_price: discountPrice ? Number(discountPrice) : null,
        sku: sku.trim(), stock: Number(stock), active: true, images: [],
      }).select().single();

      if (productError || !newProduct) throw new Error(productError?.message || "Error creando producto");

      const urls = await uploadImages(newProduct.id);
      if (urls.length > 0) await supabase.from("products").update({ images: urls }).eq("id", newProduct.id);

      for (const v of variants) {
        await supabase.from("product_variants").insert({
          product_id: newProduct.id, name: v.name, value: v.value,
          stock: Number(v.stock), price_delta: Number(v.price_delta),
        });
      }

      setName(""); setDescription(""); setCategory(""); setNewCategory(""); setSubcategory("");
      setNewSubcategory(""); setProductBrandId(""); setNewProductBrandName(""); setPrice("");
      setCostPrice(""); setDiscountPrice(""); setSku(""); setStock(""); setFiles(null); setVariants([]);

      await loadCategories(); await loadSubcategories(); await loadProductBrands(brand.id);
      alert("Producto creado correctamente.");
      router.push("/brand/products/list");
    } catch (e: any) {
      alert(e?.message || "Error creando producto");
    } finally { setSaving(false); }
  }

  function addVariant() {
    if (!variantName || !variantValue) return;
    setVariants((p) => [...p, { name: variantName, value: variantValue, stock: variantStock || 0, price_delta: variantPriceDelta || 0 }]);
    setVariantName(""); setVariantValue(""); setVariantStock(""); setVariantPriceDelta("");
  }

  function normalizeBulkRow(raw: any, index: number): BulkProductRow {
    const clean: any = {};
    for (const key of Object.keys(raw || {})) clean[normalizeHeader(key)] = raw[key];
    const errors: string[] = [];
    const productName = String(clean.name || "").trim();
    const productSku = String(clean.sku || "").trim();
    const productCategory = String(clean.category || "").trim();
    const productSubcategory = String(clean.subcategory || "").trim();
    const productBrand = String(clean.product_brand || "").trim();
    const productBrandLogoUrl = String(clean.product_brand_logo_url || "").trim();
    const productDescription = String(clean.description || "").trim();
    const productImages = parseImages(clean.images);
    const productPrice = parseMoney(clean.price);
    const productCostPrice = clean.cost_price === undefined || String(clean.cost_price).trim() === "" ? null : parseMoney(clean.cost_price);
    const productStock = Number(String(clean.stock || "").trim());
    const discountRaw = clean.discount_price;
    const productDiscount = discountRaw === undefined || String(discountRaw).trim() === "" ? null : parseMoney(discountRaw);
    if (!productName) errors.push("Falta name");
    if (!productSku) errors.push("Falta sku");
    if (!productCategory) errors.push("Falta category");
    if (!productSubcategory) errors.push("Falta subcategory");
    if (!productBrand) errors.push("Falta product_brand");
    if (!productDescription) errors.push("Falta description");
    if (!Number.isFinite(productPrice) || productPrice <= 0) errors.push("price invalido");
    if (productCostPrice !== null && (!Number.isFinite(productCostPrice) || productCostPrice < 0)) errors.push("cost_price invalido");
    if (!Number.isFinite(productStock) || productStock < 0) errors.push("stock invalido");
    if (productDiscount !== null && (!Number.isFinite(productDiscount) || productDiscount <= 0)) errors.push("discount_price invalido");
    if (productDiscount !== null && Number.isFinite(productPrice) && productDiscount >= productPrice) errors.push("discount_price debe ser menor al price");
    return { rowNumber: index + 2, name: productName, sku: productSku, category: productCategory, subcategory: productSubcategory, product_brand: productBrand, product_brand_logo_url: productBrandLogoUrl, price: productPrice, cost_price: productCostPrice, stock: productStock, description: productDescription, images: productImages, discount_price: productDiscount, errors };
  }

  function validateColumns(rows: any[]) {
    if (!rows.length) return ["El archivo esta vacio."];
    const headers = Object.keys(rows[0] || {}).map(normalizeHeader);
    const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));
    if (missing.length > 0) return [`Faltan columnas: ${missing.join(", ")}`];
    return [];
  }

  function parseCSV(file: File) {
    setBulkParsing(true); setBulkFileName(file.name); setBulkRows([]);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results: any) => {
        const rawRows = results.data || [];
        const columnErrors = validateColumns(rawRows);
        if (columnErrors.length > 0) {
          setBulkRows([{ rowNumber: 1, name: "", sku: "", category: "", subcategory: "", product_brand: "", product_brand_logo_url: "", price: 0, cost_price: null, stock: 0, description: "", images: [], discount_price: null, errors: columnErrors }]);
          setBulkParsing(false); return;
        }
        setBulkRows(rawRows.map((r: any, i: number) => normalizeBulkRow(r, i)));
        setBulkParsing(false);
      },
      error: (error: any) => {
        setBulkRows([{ rowNumber: 1, name: "", sku: "", category: "", subcategory: "", product_brand: "", product_brand_logo_url: "", price: 0, cost_price: null, stock: 0, description: "", images: [], discount_price: null, errors: [error.message] }]);
        setBulkParsing(false);
      },
    });
  }

  function handleBulkFile(file: File) {
    if (!file.name.toLowerCase().endsWith(".csv")) {
      alert("Solo se acepta .csv. Exporta tu Excel como CSV.");
      return;
    }
    parseCSV(file);
  }

  async function ensureBulkCategories(rows: BulkProductRow[]) {
    const existingMap = new Map(categories.map((c) => [c.name.trim().toLowerCase(), c.name]));
    const uniqueCategories = Array.from(new Set(rows.map((r) => r.category.trim()).filter(Boolean)));
    const toCreate = uniqueCategories.filter((c) => !existingMap.has(c.toLowerCase()));
    if (toCreate.length > 0) {
      const { error } = await supabase.from("market_categories").insert(toCreate.map((name) => ({ name, active: true, sort_order: 100 })));
      if (error && !error.message.toLowerCase().includes("duplicate")) throw new Error("No se pudieron crear las categorias: " + error.message);
      await loadCategories();
    }
  }

  async function ensureBulkSubcategories(rows: BulkProductRow[]) {
    const { data: freshSubcategories, error } = await supabase.from("market_subcategories").select("id,category_name,name").eq("active", true);
    if (error) throw new Error(error.message);
    const existingMap = new Map<string, boolean>();
    for (const s of freshSubcategories || []) existingMap.set(`${String(s.category_name).trim().toLowerCase()}::${String(s.name).trim().toLowerCase()}`, true);
    const uniquePairs = Array.from(new Map(rows.filter((r) => r.category.trim() && r.subcategory.trim()).map((r) => [`${r.category.trim().toLowerCase()}::${r.subcategory.trim().toLowerCase()}`, { category_name: r.category.trim(), name: r.subcategory.trim() }])).values());
    const toCreate = uniquePairs.filter((s) => !existingMap.has(`${s.category_name.trim().toLowerCase()}::${s.name.trim().toLowerCase()}`));
    if (toCreate.length > 0) {
      const { error: insertError } = await supabase.from("market_subcategories").insert(toCreate.map((s) => ({ category_name: s.category_name, name: s.name, active: true, sort_order: 100 })));
      if (insertError && !insertError.message.toLowerCase().includes("duplicate")) throw new Error("No se pudieron crear las subcategorias: " + insertError.message);
      await loadSubcategories();
    }
  }

  async function ensureBulkProductBrands(rows: BulkProductRow[]) {
    const { data: freshBrands, error: freshError } = await supabase.from("product_brands").select("id,name,logo_url").eq("seller_brand_id", brand.id);
    if (freshError) throw new Error(freshError.message);
    const map = new Map<string, { id: string; name: string; logo_url: string | null }>();
    for (const b of freshBrands || []) map.set(String(b.name).trim().toLowerCase(), b as any);
    const uniqueBrands = Array.from(new Map(rows.filter((r) => r.product_brand.trim()).map((r) => [r.product_brand.trim().toLowerCase(), { name: r.product_brand.trim(), logo_url: r.product_brand_logo_url || null }])).values());
    for (const b of uniqueBrands) {
      const existing = map.get(b.name.toLowerCase());
      if (existing) {
        if (!existing.logo_url && b.logo_url) { await supabase.from("product_brands").update({ logo_url: b.logo_url }).eq("id", existing.id); existing.logo_url = b.logo_url; }
        continue;
      }
      const { data: created, error } = await supabase.from("product_brands").insert({ seller_brand_id: brand.id, name: b.name, logo_url: b.logo_url, active: true }).select("id,name,logo_url").single();
      if (error || !created) throw new Error("No se pudo crear la marca " + b.name + ": " + (error?.message || ""));
      map.set(b.name.toLowerCase(), created as any);
    }
    await loadProductBrands(brand.id);
    return map;
  }

  async function importExternalImagesToSupabase(row: BulkProductRow) {
    const importedUrls: string[] = [];
    for (const imageUrl of row.images) {
      try {
        const res = await fetch("/api/import-product-image", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ imageUrl, brandId: brand.id, sku: row.sku }) });
        const json = await res.json();
        if (!res.ok || !json.publicUrl) continue;
        importedUrls.push(json.publicUrl);
      } catch {}
    }
    return importedUrls;
  }

  async function confirmBulkUpload() {
    if (bulkInvalidRows.length > 0) { alert("Corrige los errores antes de confirmar."); return; }
    if (bulkValidRows.length === 0) { alert("No hay productos validos para cargar."); return; }
    const ok = confirm(`Se cargaran ${bulkValidRows.length} productos.\nSi el SKU ya existe se actualizara. Si no existe se creara.\n\nConfirmar?`);
    if (!ok) return;
    setBulkSaving(true);
    try {
      await ensureBulkCategories(bulkValidRows);
      await ensureBulkSubcategories(bulkValidRows);
      const productBrandMap = await ensureBulkProductBrands(bulkValidRows);
      const { data: existingProducts, error: existingErr } = await supabase.from("products").select("id, sku").eq("brand_id", brand.id);
      if (existingErr) throw new Error(existingErr.message);
      const existingBySku = new Map<string, string>();
      for (const p of existingProducts || []) { if (p.sku) existingBySku.set(String(p.sku).trim().toLowerCase(), p.id); }
      let created = 0; let updated = 0;
      for (const row of bulkValidRows) {
        const existingId = existingBySku.get(row.sku.toLowerCase());
        const pb = productBrandMap.get(row.product_brand.trim().toLowerCase());
        const importedImages = await importExternalImagesToSupabase(row);
        const payload = { brand_id: brand.id, product_brand_id: pb?.id || null, name: row.name, sku: row.sku, category: row.category, subcategory: row.subcategory, price: row.price, cost_price: row.cost_price, discount_price: row.discount_price, stock: row.stock, description: row.description, images: importedImages.length > 0 ? importedImages : row.images, active: true };
        if (existingId) {
          const { error } = await supabase.from("products").update(payload).eq("id", existingId).eq("brand_id", brand.id);
          if (error) throw new Error(`Error actualizando SKU ${row.sku}: ${error.message}`);
          updated++;
        } else {
          const { error } = await supabase.from("products").insert(payload);
          if (error) throw new Error(`Error creando SKU ${row.sku}: ${error.message}`);
          created++;
        }
      }
      await loadCategories(); await loadSubcategories(); await loadProductBrands(brand.id);
      alert(`Carga completada.\nCreados: ${created}\nActualizados: ${updated}`);
      setBulkRows([]); setBulkFileName("");
      router.push("/brand/products/list");
    } catch (e: any) {
      alert(e?.message || "Error en carga masiva.");
    } finally { setBulkSaving(false); }
  }

  function downloadTemplateCSV() {
    const csv = "name,sku,category,subcategory,product_brand,product_brand_logo_url,price,cost_price,stock,description,images,discount_price\n" +
      'Proteina Whey 2lb,WHEY-001,Suplementos,Proteinas,Nutrex,https://logo-marca.png,120000,78000,25,"Proteina de alta calidad","https://imagen1.jpg,https://imagen2.jpg",99000\n';
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla-productos-nova.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };

  if (loading || !brand) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Catalogo</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Crear producto</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Crea productos manualmente o mediante carga masiva CSV</p>
      </div>

      {/* ── CARGA MASIVA ── */}
      <div className="bg-white rounded-2xl p-6 space-y-5" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Carga masiva de productos</h2>
            <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Sube un CSV, revisa la vista previa y confirma la carga</p>
          </div>
          <button type="button" onClick={downloadTemplateCSV}
            className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer shrink-0"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
            Descargar plantilla CSV
          </button>
        </div>

        <div className="rounded-xl p-5" style={{ border: "1.5px dashed var(--nomi-teal)", backgroundColor: "var(--nomi-teal-bg)" }}>
          <input type="file" accept=".csv"
            onChange={(e) => { const file = e.target.files?.[0]; if (file) handleBulkFile(file); }}
            className="block w-full text-sm font-semibold cursor-pointer" style={{ color: "var(--nomi-teal)" }} />
          <p className="text-xs mt-2" style={{ color: "var(--nomi-muted)" }}>
            Columnas requeridas: <b>name, sku, category, subcategory, product_brand, price, cost_price, stock, description, images</b>. Opcionales: <b>discount_price, product_brand_logo_url</b>.
          </p>
        </div>

        {bulkParsing && <p className="text-sm font-semibold" style={{ color: "var(--nomi-teal)" }}>Leyendo archivo...</p>}

        {bulkRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <p className="text-sm" style={{ color: "var(--nomi-navy)" }}>
                Archivo: <b>{bulkFileName}</b> · Validos: <b style={{ color: "var(--nomi-teal)" }}>{bulkValidRows.length}</b> · Errores: <b style={{ color: "#DC2626" }}>{bulkInvalidRows.length}</b>
              </p>
              <div className="flex gap-2">
                <button type="button" onClick={() => { setBulkRows([]); setBulkFileName(""); }}
                  className="px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                  Cancelar
                </button>
                <button type="button" onClick={confirmBulkUpload} disabled={bulkSaving || bulkInvalidRows.length > 0}
                  className="px-4 py-2 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                  {bulkSaving ? "Cargando..." : "Confirmar carga"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto rounded-xl" style={{ border: "1.5px solid var(--nomi-border)" }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: "var(--nomi-gray)" }}>
                  <tr>
                    {["Fila","Producto","SKU","Categoria","Subcategoria","Marca","Precio","Costo","Margen","Stock","Imgs","Estado"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.slice(0, 50).map((r) => {
                    const margin = r.cost_price !== null && r.price > 0 ? ((r.price - r.cost_price) / r.price) * 100 : null;
                    const hasErr = r.errors.length > 0;
                    return (
                      <tr key={r.rowNumber} style={{ borderBottom: "1px solid var(--nomi-border)", backgroundColor: hasErr ? "#FEF2F2" : "#fff" }}>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.rowNumber}</td>
                        <td className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--nomi-navy)" }}>{r.name || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.sku || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.category || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.subcategory || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.product_brand || "—"}</td>
                        <td className="px-3 py-2 text-xs font-bold" style={{ color: "var(--nomi-teal)" }}>{Number.isFinite(r.price) ? formatCOP(r.price) : "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-orange)" }}>{r.cost_price !== null && Number.isFinite(r.cost_price) ? formatCOP(r.cost_price) : "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-navy)" }}>{margin !== null && Number.isFinite(margin) ? `${margin.toFixed(1)}%` : "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-navy)" }}>{Number.isFinite(r.stock) ? r.stock : "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.images.length}</td>
                        <td className="px-3 py-2 text-xs">
                          {hasErr
                            ? <span style={{ color: "#DC2626" }}>{r.errors.join(", ")}</span>
                            : <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>Listo</span>}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            {bulkRows.length > 50 && <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>Mostrando las primeras 50 filas de {bulkRows.length}.</p>}
          </div>
        )}
      </div>

      {/* ── FORMULARIO MANUAL ── */}
      <div className="bg-white rounded-2xl p-6 space-y-7" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Crear producto manualmente</h2>

        {/* BLOQUE 1: INFO BASICA */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Informacion basica</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre *</label>
              <input style={IS} placeholder="Nombre del producto" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>SKU</label>
              <input style={IS} placeholder="SKU" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
              <textarea style={{ ...IS, resize: "vertical" as const }} rows={3} placeholder="Descripcion del producto" value={description} onChange={(e) => setDescription(e.target.value)} />
            </div>
          </div>
        </div>

        {/* BLOQUE 2: MARCA Y CATEGORIA */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Marca y categoria</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Marca existente</label>
              <select style={IS} value={productBrandId}
                onChange={(e) => { setProductBrandId(e.target.value); if (e.target.value) setNewProductBrandName(""); }}>
                <option value="">Seleccionar marca</option>
                {productBrands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </select>
              <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>Crea marcas con logo en la seccion Marcas del menu</p>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>O escribe nueva marca (sin logo)</label>
              <input style={IS} placeholder="Ej: Samsung, Adidas" value={newProductBrandName}
                onChange={(e) => { setNewProductBrandName(e.target.value); if (e.target.value.trim()) setProductBrandId(""); }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Categoria existente</label>
              <select style={IS} value={category}
                onChange={(e) => { setCategory(e.target.value); setSubcategory(""); setNewSubcategory(""); if (e.target.value) setNewCategory(""); }}>
                <option value="">Seleccionar categoria</option>
                {categories.map((c) => <option key={c.id} value={c.name}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>O escribe nueva categoria</label>
              <input style={IS} placeholder="Ej: Tecnologia, Belleza" value={newCategory}
                onChange={(e) => { setNewCategory(e.target.value); setSubcategory(""); setNewSubcategory(""); if (e.target.value.trim()) setCategory(""); }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Subcategoria existente</label>
              <select style={IS} value={subcategory} disabled={!selectedCategoryName}
                onChange={(e) => { setSubcategory(e.target.value); if (e.target.value) setNewSubcategory(""); }}>
                <option value="">{selectedCategoryName ? "Seleccionar subcategoria" : "Primero selecciona una categoria"}</option>
                {filteredSubcategories.map((s) => <option key={s.id} value={s.name}>{s.name}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>O escribe nueva subcategoria</label>
              <input style={IS} placeholder="Ej: Proteinas, Ropa deportiva" value={newSubcategory} disabled={!selectedCategoryName}
                onChange={(e) => { setNewSubcategory(e.target.value); if (e.target.value.trim()) setSubcategory(""); }} />
            </div>
          </div>
        </div>

        {/* BLOQUE 3: PRECIOS Y STOCK */}
        <div className="space-y-4">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Precios y stock</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio venta *</label>
              <input style={IS} placeholder="0" value={price} onChange={(e) => setPrice(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Costo interno</label>
              <input style={IS} placeholder="0" value={costPrice} onChange={(e) => setCostPrice(e.target.value)} />
              {manualMargin !== null && Number.isFinite(manualMargin) && (
                <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-teal)" }}>Margen: {manualMargin.toFixed(1)}%</p>
              )}
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio descuento</label>
              <input style={IS} placeholder="0" value={discountPrice} onChange={(e) => setDiscountPrice(e.target.value)} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Stock *</label>
              <input style={IS} placeholder="0" value={stock} onChange={(e) => setStock(e.target.value)} />
            </div>
          </div>
        </div>

        {/* BLOQUE 4: IMAGENES */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Imagenes</p>
          <label className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer w-fit"
            style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px dashed var(--nomi-teal)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--nomi-teal)" }}>+ Seleccionar imagenes</span>
            <input id="imageUpload" type="file" multiple accept="image/*" className="hidden" onChange={(e) => setFiles(e.target.files)} />
          </label>
          {files && <p className="text-xs font-semibold" style={{ color: "var(--nomi-teal)" }}>{files.length} archivo(s) seleccionado(s)</p>}
        </div>

        {/* BLOQUE 5: VARIANTES */}
        <div className="space-y-3">
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Variantes (opcional)</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            {[
              { ph: "Nombre (ej: Talla)", val: variantName,       set: setVariantName },
              { ph: "Valor (ej: M)",      val: variantValue,      set: setVariantValue },
              { ph: "Stock",              val: variantStock,      set: setVariantStock },
              { ph: "Precio adicional",   val: variantPriceDelta, set: setVariantPriceDelta },
            ].map(({ ph, val, set }) => (
              <input key={ph} style={IS} placeholder={ph} value={val} onChange={(e) => set(e.target.value)} />
            ))}
          </div>
          <button type="button" onClick={addVariant}
            className="px-4 py-2 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-teal)", color: "#fff" }}>
            + Agregar variante
          </button>
          {variants.length > 0 && (
            <div className="space-y-2 mt-2">
              {variants.map((v, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)", color: "var(--nomi-navy)" }}>
                  <span className="font-semibold">{v.name}:</span> {v.value}
                  <span style={{ color: "var(--nomi-muted)" }}>· Stock {v.stock}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <button onClick={handleCreateProduct} disabled={saving}
          className="w-full py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {saving ? "Guardando..." : "Crear producto"}
        </button>
      </div>
    </div>
  );
}
