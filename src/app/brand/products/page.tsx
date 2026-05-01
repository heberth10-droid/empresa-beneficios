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

type BulkProductRow = {
  rowNumber: number;
  name: string;
  sku: string;
  category: string;
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

  return raw
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);
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
  const [products, setProducts] = useState<any[]>([]);
  const [categories, setCategories] = useState<MarketCategory[]>([]);

  // Form manual
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

  // Carga masiva CSV
  const [bulkRows, setBulkRows] = useState<BulkProductRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

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

  function normalizeBulkRow(raw: any, index: number): BulkProductRow {
    const clean: any = {};

    for (const key of Object.keys(raw || {})) {
      clean[normalizeHeader(key)] = raw[key];
    }

    const errors: string[] = [];

    const productName = String(clean.name || "").trim();
    const productSku = String(clean.sku || "").trim();
    const productCategory = String(clean.category || "").trim();
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
    if (!productDescription) errors.push("Falta description");
    if (!Number.isFinite(productPrice) || productPrice <= 0) errors.push("price inválido");
    if (!Number.isFinite(productStock) || productStock < 0) errors.push("stock inválido");

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
        throw new Error("No se pudieron crear las categorías nuevas: " + error.message);
      }

      await loadCategories();
    }
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

        const payload = {
          brand_id: brand.id,
          name: row.name,
          sku: row.sku,
          category: row.category,
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

          if (error) throw new Error(`Error actualizando SKU ${row.sku}: ${error.message}`);
          updated++;
        } else {
          const { error } = await supabase.from("products").insert(payload);

          if (error) throw new Error(`Error creando SKU ${row.sku}: ${error.message}`);
          created++;
        }
      }

      await loadProducts(brand.id);
      await loadCategories();

      alert(`Carga completada.\nCreados: ${created}\nActualizados: ${updated}`);

      setBulkRows([]);
      setBulkFileName("");
    } catch (e: any) {
      alert(e?.message || "Error en carga masiva.");
      console.error(e);
    } finally {
      setBulkSaving(false);
    }
  }

  function downloadTemplateCSV() {
    const csv =
      "name,sku,category,price,stock,description,images,discount_price\n" +
      'Proteína Whey 2lb,WHEY-001,Suplementos,120000,25,"Proteína de alta calidad","https://imagen1.jpg,https://imagen2.jpg",99000\n';

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-productos-nova.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  if (loading || !brand) {
    return <div className="p-10 text-slate-300">Cargando panel de productos…</div>;
  }

  return (
    <div className="space-y-12 p-6">
      <div>
        <h1 className="text-3xl font-bold">Productos de {brand.name}</h1>
        <p className="text-slate-400">
          Administra catálogo, categorías, variantes e inventario.
        </p>
      </div>

      {/* CARGA MASIVA */}
      <div className="bg-slate-900 p-6 border border-slate-800 rounded-lg space-y-5">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="text-xl font-semibold">Carga masiva de productos</h2>
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
            <b>name, sku, category, price, stock, description, images</b>. Columna
            opcional: <b>discount_price</b>.
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
                <b className="text-emerald-400">{bulkValidRows.length}</b> · Errores:{" "}
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
                      <td className="p-3 text-slate-300">{r.category || "—"}</td>
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

      {/* FORMULARIO MANUAL */}
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

      {/* LISTA */}
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