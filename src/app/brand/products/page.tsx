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
  stock: number;
  description: string;
  images: string[];
  discount_price: number | null;
  errors: string[];
};

const REQUIRED_COLUMNS = [
  "name",
  "sku",
  "category",
  "subcategory",
  "product_brand",
  "price",
  "stock",
  "description",
  "images",
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
  const raw = String(value || "")
    .replaceAll("$", "")
    .replaceAll(".", "")
    .replaceAll(",", ".")
    .trim();

  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(value || 0));
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

  const filteredSubcategories = useMemo(() => {
    if (!selectedCategoryName) return [];

    return subcategories.filter(
      (s) =>
        s.category_name.trim().toLowerCase() ===
        selectedCategoryName.trim().toLowerCase()
    );
  }, [subcategories, selectedCategoryName]);

  const bulkValidRows = useMemo(
    () => bulkRows.filter((r) => r.errors.length === 0),
    [bulkRows]
  );

  const bulkInvalidRows = useMemo(
    () => bulkRows.filter((r) => r.errors.length > 0),
    [bulkRows]
  );

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

      await Promise.all([
        loadCategories(),
        loadSubcategories(),
        loadProductBrands(brandData.id),
      ]);

      setLoading(false);
    }

    init();
  }, [router]);

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

  async function loadSubcategories() {
    const { data, error } = await supabase
      .from("market_subcategories")
      .select("id,category_name,name")
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando subcategorías:", error);
      setSubcategories([]);
      return;
    }

    setSubcategories((data || []) as MarketSubcategory[]);
  }

  async function loadProductBrands(brandId: string) {
    const { data, error } = await supabase
      .from("product_brands")
      .select("id,seller_brand_id,name,logo_url,active")
      .eq("seller_brand_id", brandId)
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error("Error cargando marcas de producto:", error);
      setProductBrands([]);
      return;
    }

    setProductBrands((data || []) as ProductBrand[]);
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

  async function ensureSubcategory(finalCategory: string) {
    const cleanNew = newSubcategory.trim();
    const cleanSelected = subcategory.trim();

    if (cleanNew) {
      const { error } = await supabase.from("market_subcategories").insert({
        category_name: finalCategory,
        name: cleanNew,
        active: true,
        sort_order: 100,
      });

      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error("No se pudo crear la subcategoría: " + error.message);
      }

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
      const existing = productBrands.find(
        (b) => b.name.trim().toLowerCase() === cleanNew.toLowerCase()
      );

      if (existing) return existing.id;

      const { data: createdBrand, error } = await supabase
        .from("product_brands")
        .insert({
          seller_brand_id: brand.id,
          name: cleanNew,
          active: true,
          logo_url: null,
        })
        .select()
        .single();

      if (error || !createdBrand) {
        throw new Error(
          "No se pudo crear la marca del producto: " + (error?.message || "")
        );
      }

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
      if (!price || Number(price) <= 0)
        throw new Error("El precio debe ser mayor a 0.");
      if (!stock || Number(stock) < 0)
        throw new Error("El stock es obligatorio.");

      const finalCategory = await ensureCategory();
      const finalSubcategory = await ensureSubcategory(finalCategory);
      const finalProductBrandId = await ensureProductBrand();

      const { data: newProduct, error: productError } = await supabase
        .from("products")
        .insert({
          brand_id: brand.id,
          product_brand_id: finalProductBrandId,
          name: name.trim(),
          description: description.trim(),
          category: finalCategory,
          subcategory: finalSubcategory,
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
      setSubcategory("");
      setNewSubcategory("");
      setProductBrandId("");
      setNewProductBrandName("");
      setPrice("");
      setDiscountPrice("");
      setSku("");
      setStock("");
      setFiles(null);
      setVariants([]);

      await loadCategories();
      await loadSubcategories();
      await loadProductBrands(brand.id);

      alert("Producto creado correctamente.");
      router.push("/brand/products/list");
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

  function normalizeBulkRow(raw: any, index: number): BulkProductRow {
    const clean: any = {};

    for (const key of Object.keys(raw || {})) {
      clean[normalizeHeader(key)] = raw[key];
    }

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
    const productStock = Number(String(clean.stock || "").trim());

    const discountRaw = clean.discount_price;
    const productDiscount =
      discountRaw === undefined || String(discountRaw).trim() === ""
        ? null
        : parseMoney(discountRaw);

    if (!productName) errors.push("Falta name");
    if (!productSku) errors.push("Falta sku");
    if (!productCategory) errors.push("Falta category");
    if (!productSubcategory) errors.push("Falta subcategory");
    if (!productBrand) errors.push("Falta product_brand");
    if (!productDescription) errors.push("Falta description");
    if (!Number.isFinite(productPrice) || productPrice <= 0)
      errors.push("price inválido");
    if (!Number.isFinite(productStock) || productStock < 0)
      errors.push("stock inválido");

    if (
      productDiscount !== null &&
      (!Number.isFinite(productDiscount) || productDiscount <= 0)
    ) {
      errors.push("discount_price inválido");
    }

    if (
      productDiscount !== null &&
      Number.isFinite(productPrice) &&
      productDiscount >= productPrice
    ) {
      errors.push("discount_price debe ser menor al price");
    }

    return {
      rowNumber: index + 2,
      name: productName,
      sku: productSku,
      category: productCategory,
      subcategory: productSubcategory,
      product_brand: productBrand,
      product_brand_logo_url: productBrandLogoUrl,
      price: productPrice,
      stock: productStock,
      description: productDescription,
      images: productImages,
      discount_price: productDiscount,
      errors,
    };
  }

  function validateColumns(rows: any[]) {
    if (!rows.length) return ["El archivo está vacío."];

    const first = rows[0] || {};
    const headers = Object.keys(first).map(normalizeHeader);
    const missing = REQUIRED_COLUMNS.filter((col) => !headers.includes(col));

    if (missing.length > 0) {
      return [`Faltan columnas requeridas: ${missing.join(", ")}`];
    }

    return [];
  }

  function parseCSV(file: File) {
    setBulkParsing(true);
    setBulkFileName(file.name);
    setBulkRows([]);

    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results: any) => {
        const rawRows = results.data || [];
        const columnErrors = validateColumns(rawRows);

        if (columnErrors.length > 0) {
          setBulkRows([
            {
              rowNumber: 1,
              name: "",
              sku: "",
              category: "",
              subcategory: "",
              product_brand: "",
              product_brand_logo_url: "",
              price: 0,
              stock: 0,
              description: "",
              images: [],
              discount_price: null,
              errors: columnErrors,
            },
          ]);
          setBulkParsing(false);
          return;
        }

        setBulkRows(rawRows.map((r: any, i: number) => normalizeBulkRow(r, i)));
        setBulkParsing(false);
      },
      error: (error) => {
        setBulkRows([
          {
            rowNumber: 1,
            name: "",
            sku: "",
            category: "",
            subcategory: "",
            product_brand: "",
            product_brand_logo_url: "",
            price: 0,
            stock: 0,
            description: "",
            images: [],
            discount_price: null,
            errors: [error.message],
          },
        ]);
        setBulkParsing(false);
      },
    });
  }

  function handleBulkFile(file: File) {
    const fileName = file.name.toLowerCase();

    if (!fileName.endsWith(".csv")) {
      alert("Por ahora solo se acepta archivo .csv. Puedes exportar tu Excel como CSV.");
      return;
    }

    parseCSV(file);
  }

  async function ensureBulkCategories(rows: BulkProductRow[]) {
    const existingMap = new Map(
      categories.map((c) => [c.name.trim().toLowerCase(), c.name])
    );

    const uniqueCategories = Array.from(
      new Set(rows.map((r) => r.category.trim()).filter(Boolean))
    );

    const categoriesToCreate = uniqueCategories.filter(
      (c) => !existingMap.has(c.toLowerCase())
    );

    if (categoriesToCreate.length > 0) {
      const { error } = await supabase.from("market_categories").insert(
        categoriesToCreate.map((name) => ({
          name,
          active: true,
          sort_order: 100,
        }))
      );

      if (error && !error.message.toLowerCase().includes("duplicate")) {
        throw new Error(
          "No se pudieron crear las categorías nuevas: " + error.message
        );
      }

      await loadCategories();
    }
  }

  async function ensureBulkSubcategories(rows: BulkProductRow[]) {
    const { data: freshSubcategories, error } = await supabase
      .from("market_subcategories")
      .select("id,category_name,name")
      .eq("active", true);

    if (error) throw new Error(error.message);

    const existingMap = new Map<string, boolean>();

    for (const s of freshSubcategories || []) {
      existingMap.set(
        `${String(s.category_name).trim().toLowerCase()}::${String(s.name)
          .trim()
          .toLowerCase()}`,
        true
      );
    }

    const uniquePairs = Array.from(
      new Map(
        rows
          .filter((r) => r.category.trim() && r.subcategory.trim())
          .map((r) => [
            `${r.category.trim().toLowerCase()}::${r.subcategory
              .trim()
              .toLowerCase()}`,
            {
              category_name: r.category.trim(),
              name: r.subcategory.trim(),
            },
          ])
      ).values()
    );

    const toCreate = uniquePairs.filter(
      (s) =>
        !existingMap.has(
          `${s.category_name.trim().toLowerCase()}::${s.name
            .trim()
            .toLowerCase()}`
        )
    );

    if (toCreate.length > 0) {
      const { error: insertError } = await supabase
        .from("market_subcategories")
        .insert(
          toCreate.map((s) => ({
            category_name: s.category_name,
            name: s.name,
            active: true,
            sort_order: 100,
          }))
        );

      if (
        insertError &&
        !insertError.message.toLowerCase().includes("duplicate")
      ) {
        throw new Error(
          "No se pudieron crear las subcategorías nuevas: " +
            insertError.message
        );
      }

      await loadSubcategories();
    }
  }

  async function ensureBulkProductBrands(rows: BulkProductRow[]) {
    const { data: freshBrands, error: freshError } = await supabase
      .from("product_brands")
      .select("id,name,logo_url")
      .eq("seller_brand_id", brand.id);

    if (freshError) throw new Error(freshError.message);

    const map = new Map<
      string,
      { id: string; name: string; logo_url: string | null }
    >();

    for (const b of freshBrands || []) {
      map.set(String(b.name).trim().toLowerCase(), b as any);
    }

    const uniqueBrands = Array.from(
      new Map(
        rows
          .filter((r) => r.product_brand.trim())
          .map((r) => [
            r.product_brand.trim().toLowerCase(),
            {
              name: r.product_brand.trim(),
              logo_url: r.product_brand_logo_url || null,
            },
          ])
      ).values()
    );

    for (const b of uniqueBrands) {
      const existing = map.get(b.name.toLowerCase());

      if (existing) {
        if (!existing.logo_url && b.logo_url) {
          await supabase
            .from("product_brands")
            .update({ logo_url: b.logo_url })
            .eq("id", existing.id);

          existing.logo_url = b.logo_url;
        }

        continue;
      }

      const { data: created, error } = await supabase
        .from("product_brands")
        .insert({
          seller_brand_id: brand.id,
          name: b.name,
          logo_url: b.logo_url,
          active: true,
        })
        .select("id,name,logo_url")
        .single();

      if (error || !created) {
        throw new Error(
          "No se pudo crear la marca del producto " +
            b.name +
            ": " +
            (error?.message || "")
        );
      }

      map.set(b.name.toLowerCase(), created as any);
    }

    await loadProductBrands(brand.id);
    return map;
  }

  async function importExternalImagesToSupabase(row: BulkProductRow) {
  const importedUrls: string[] = [];

  for (const imageUrl of row.images) {
    try {
      const res = await fetch("/api/import-product-image", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          imageUrl,
          brandId: brand.id,
          sku: row.sku,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.publicUrl) {
        console.warn("No se pudo importar imagen:", imageUrl, json.error);
        continue;
      }

      importedUrls.push(json.publicUrl);
    } catch (error) {
      console.warn("Error importando imagen:", imageUrl, error);
    }
  }

  return importedUrls;
}

  async function confirmBulkUpload() {
    if (bulkInvalidRows.length > 0) {
      alert("Corrige los errores antes de confirmar la carga.");
      return;
    }

    if (bulkValidRows.length === 0) {
      alert("No hay productos válidos para cargar.");
      return;
    }

    const ok = confirm(
      `Se cargarán ${bulkValidRows.length} productos.\n\nSi el SKU ya existe en esta marca, se actualizará. Si no existe, se creará.\n\n¿Confirmar carga?`
    );

    if (!ok) return;

    setBulkSaving(true);

    try {
      await ensureBulkCategories(bulkValidRows);
      await ensureBulkSubcategories(bulkValidRows);
      const productBrandMap = await ensureBulkProductBrands(bulkValidRows);

      const { data: existingProducts, error: existingErr } = await supabase
        .from("products")
        .select("id, sku")
        .eq("brand_id", brand.id);

      if (existingErr) throw new Error(existingErr.message);

      const existingBySku = new Map<string, string>();

      for (const p of existingProducts || []) {
        if (p.sku) existingBySku.set(String(p.sku).trim().toLowerCase(), p.id);
      }

      let created = 0;
      let updated = 0;

      for (const row of bulkValidRows) {
        const existingId = existingBySku.get(row.sku.toLowerCase());
        const pb = productBrandMap.get(row.product_brand.trim().toLowerCase());

        const payload = {
          brand_id: brand.id,
          product_brand_id: pb?.id || null,
          name: row.name,
          sku: row.sku,
          category: row.category,
          subcategory: row.subcategory,
          price: row.price,
          discount_price: row.discount_price,
          stock: row.stock,
          description: row.description,
          images: row.images,
          active: true,
        };

        if (existingId) {
          const { error } = await supabase
            .from("products")
            .update(payload)
            .eq("id", existingId)
            .eq("brand_id", brand.id);

          if (error) {
            throw new Error(
              `Error actualizando SKU ${row.sku}: ${error.message}`
            );
          }

          updated++;
        } else {
          const { error } = await supabase.from("products").insert(payload);

          if (error) {
            throw new Error(`Error creando SKU ${row.sku}: ${error.message}`);
          }

          created++;
        }
      }

      await loadCategories();
      await loadSubcategories();
      await loadProductBrands(brand.id);

      alert(`Carga completada.\nCreados: ${created}\nActualizados: ${updated}`);

      setBulkRows([]);
      setBulkFileName("");
      router.push("/brand/products/list");
    } catch (e: any) {
      alert(e?.message || "Error en carga masiva.");
      console.error(e);
    } finally {
      setBulkSaving(false);
    }
  }

  function downloadTemplateCSV() {
    const csv =
      "name,sku,category,subcategory,product_brand,product_brand_logo_url,price,stock,description,images,discount_price\n" +
      'Proteína Whey 2lb,WHEY-001,Suplementos,Proteínas,Nutrex,https://logo-marca.png,120000,25,"Proteína de alta calidad","https://imagen1.jpg,https://imagen2.jpg",99000\n';

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-productos-nova.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  if (loading || !brand) {
    return (
      <div className="p-10 text-slate-300">
        Cargando panel de productos…
      </div>
    );
  }

  return (
    <div className="space-y-12 p-6">
      <div>
        <h1 className="text-3xl font-bold">Crear producto</h1>
        <p className="text-slate-400">
          Crea productos manualmente o mediante carga masiva CSV.
        </p>
      </div>

      {/* CARGA MASIVA */}
      <div className="bg-slate-900 p-6 border border-slate-800 rounded-lg space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">
              Carga masiva de productos
            </h2>
            <p className="text-slate-400 text-sm">
              Sube un CSV, revisa la vista previa y confirma la carga.
            </p>
          </div>

          <button
            type="button"
            onClick={downloadTemplateCSV}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm"
          >
            Descargar plantilla CSV
          </button>
        </div>

        <div className="border border-dashed border-slate-700 rounded-lg p-5 bg-slate-950/40">
          <input
            type="file"
            accept=".csv"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) handleBulkFile(file);
            }}
            className="block w-full text-sm text-slate-300"
          />

          <div className="text-xs text-slate-500 mt-3">
            Columnas requeridas:{" "}
            <b>
              name, sku, category, subcategory, product_brand, price, stock,
              description, images
            </b>
            . Opcionales: <b>discount_price, product_brand_logo_url</b>.
          </div>
        </div>

        {bulkParsing && (
          <div className="text-emerald-400 text-sm">Leyendo archivo...</div>
        )}

        {bulkRows.length > 0 && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
              <div className="text-sm text-slate-300">
                Archivo: <b>{bulkFileName}</b> · Válidos:{" "}
                <b className="text-emerald-400">{bulkValidRows.length}</b> ·
                Errores:{" "}
                <b className="text-red-300">{bulkInvalidRows.length}</b>
              </div>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setBulkRows([]);
                    setBulkFileName("");
                  }}
                  className="px-4 py-2 rounded border border-slate-700 text-slate-300 hover:bg-slate-800 text-sm"
                >
                  Cancelar
                </button>

                <button
                  type="button"
                  onClick={confirmBulkUpload}
                  disabled={bulkSaving || bulkInvalidRows.length > 0}
                  className="px-4 py-2 rounded bg-emerald-500 text-black font-bold hover:bg-emerald-400 disabled:opacity-50 text-sm"
                >
                  {bulkSaving ? "Cargando..." : "Confirmar carga"}
                </button>
              </div>
            </div>

            <div className="overflow-x-auto border border-slate-800 rounded-lg">
              <table className="w-full text-sm">
                <thead className="bg-slate-800 text-slate-300">
                  <tr>
                    <th className="p-3 text-left">Fila</th>
                    <th className="p-3 text-left">Producto</th>
                    <th className="p-3 text-left">SKU</th>
                    <th className="p-3 text-left">Categoría</th>
                    <th className="p-3 text-left">Subcategoría</th>
                    <th className="p-3 text-left">Marca</th>
                    <th className="p-3 text-left">Precio</th>
                    <th className="p-3 text-left">Stock</th>
                    <th className="p-3 text-left">Imágenes</th>
                    <th className="p-3 text-left">Estado</th>
                  </tr>
                </thead>

                <tbody>
                  {bulkRows.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber} className="border-t border-slate-800">
                      <td className="p-3 text-slate-400">{r.rowNumber}</td>
                      <td className="p-3 text-slate-200">{r.name || "—"}</td>
                      <td className="p-3 text-slate-400">{r.sku || "—"}</td>
                      <td className="p-3 text-slate-300">
                        {r.category || "—"}
                      </td>
                      <td className="p-3 text-slate-300">
                        {r.subcategory || "—"}
                      </td>
                      <td className="p-3 text-slate-300">
                        {r.product_brand || "—"}
                      </td>
                      <td className="p-3 text-emerald-400">
                        {Number.isFinite(r.price) ? formatCOP(r.price) : "—"}
                      </td>
                      <td className="p-3 text-slate-300">
                        {Number.isFinite(r.stock) ? r.stock : "—"}
                      </td>
                      <td className="p-3 text-slate-300">{r.images.length}</td>
                      <td className="p-3">
                        {r.errors.length > 0 ? (
                          <span className="text-red-300">
                            {r.errors.join(", ")}
                          </span>
                        ) : (
                          <span className="text-emerald-400">Listo</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {bulkRows.length > 50 && (
              <div className="text-xs text-slate-500">
                Mostrando las primeras 50 filas de {bulkRows.length}.
              </div>
            )}
          </div>
        )}
      </div>

      {/* FORMULARIO */}
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
              Marca del producto
            </label>

            <select
              className="p-3 bg-slate-800 rounded w-full"
              value={productBrandId}
              onChange={(e) => {
                setProductBrandId(e.target.value);
                if (e.target.value) setNewProductBrandName("");
              }}
            >
              <option value="">Seleccionar marca</option>
              {productBrands.map((b) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>

            <p className="text-xs text-slate-500 mt-1">
              Las marcas con logo se crean en Productos → Crear marca.
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Crear nueva marca sin logo
            </label>

            <input
              className="p-3 bg-slate-800 rounded w-full"
              placeholder="Ej: Nutrex, Apple, Adidas"
              value={newProductBrandName}
              onChange={(e) => {
                setNewProductBrandName(e.target.value);
                if (e.target.value.trim()) setProductBrandId("");
              }}
            />

            <p className="text-xs text-slate-500 mt-1">
              Para subir logo, usa la sección Crear marca del menú lateral.
            </p>
          </div>

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Categoría existente
            </label>
            <select
              className="p-3 bg-slate-800 rounded w-full"
              value={category}
              onChange={(e) => {
                setCategory(e.target.value);
                setSubcategory("");
                setNewSubcategory("");
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
                setSubcategory("");
                setNewSubcategory("");
                if (e.target.value.trim()) setCategory("");
              }}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Subcategoría existente
            </label>

            <select
              className="p-3 bg-slate-800 rounded w-full"
              value={subcategory}
              onChange={(e) => {
                setSubcategory(e.target.value);
                if (e.target.value) setNewSubcategory("");
              }}
              disabled={!selectedCategoryName}
            >
              <option value="">
                {selectedCategoryName
                  ? "Seleccionar subcategoría"
                  : "Primero selecciona una categoría"}
              </option>
              {filteredSubcategories.map((s) => (
                <option key={s.id} value={s.name}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Crear nueva subcategoría
            </label>

            <input
              className="p-3 bg-slate-800 rounded w-full"
              placeholder="Ej: Proteínas, Creatinas, Ropa deportiva"
              value={newSubcategory}
              onChange={(e) => {
                setNewSubcategory(e.target.value);
                if (e.target.value.trim()) setSubcategory("");
              }}
              disabled={!selectedCategoryName}
            />
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
    </div>
  );
}