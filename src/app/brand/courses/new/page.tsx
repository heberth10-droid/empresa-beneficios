"use client";

import { useEffect, useRef, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import Papa from "papaparse";

const IMAGE_BUCKET = "product-images";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function parseMoney(v: any) {
  const raw = String(v || "").replace(/\$/g, "").replace(/\./g, "").replace(/,/g, ".").trim();
  const n = Number(raw);
  return Number.isFinite(n) ? n : NaN;
}

type BulkCourseRow = {
  rowNumber: number;
  name: string;
  category: string;
  description: string;
  price: number;
  discount_price: number | null;
  image_url: string;
  errors: string[];
};

function normalizeHeader(v: string) {
  return String(v || "").trim().toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
}

export default function NewCoursePage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageFileRef = useRef<HTMLInputElement>(null);

  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [existingCategories, setExistingCategories] = useState<string[]>([]);
  const [showCatSuggestions, setShowCatSuggestions] = useState(false);

  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [category, setCategory] = useState("");
  const [imageUrl, setImageUrl] = useState("");
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [active, setActive] = useState(true);
  const [uploadingImage, setUploadingImage] = useState(false);

  const [bulkRows, setBulkRows] = useState<BulkCourseRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) { router.push("/login"); return; }
      const { data: userRow } = await supabase.from("users").select("role, brand_id").eq("auth_id", u.user.id).single();
      if (!userRow || userRow.role !== "BRAND_ADMIN") { router.push("/login"); return; }
      setBrandId(userRow.brand_id);
      const { data: cats } = await supabase.from("course_categories").select("name").eq("active", true).order("name");
      setExistingCategories((cats || []).map((c: any) => c.name));
    }
    load();
  }, [router]);

  const catSuggestions = useMemo(() => {
    if (!category.trim()) return existingCategories;
    return existingCategories.filter((c) => c.toLowerCase().includes(category.toLowerCase()));
  }, [category, existingCategories]);

  async function ensureCategory(catName: string) {
    if (!catName.trim()) return;
    const exists = existingCategories.some((c) => c.toLowerCase() === catName.toLowerCase());
    if (!exists) {
      await supabase.from("course_categories").insert({ name: catName.trim(), active: true, sort_order: 100 });
      setExistingCategories((prev) => [...prev, catName.trim()]);
    }
  }

  async function uploadImageFile(file: File, bId: string, courseName: string): Promise<string | null> {
    const ext = file.name.split(".").pop() || "jpg";
    const safeName = courseName.replace(/[^a-zA-Z0-9-_]/g, "-").slice(0, 40);
    const fileName = `${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
    const filePath = `${bId}/courses/${safeName}/${fileName}`;
    const { error } = await supabase.storage.from(IMAGE_BUCKET).upload(filePath, file, { contentType: file.type, cacheControl: "3600", upsert: true });
    if (error) return null;
    return supabase.storage.from(IMAGE_BUCKET).getPublicUrl(filePath).data.publicUrl;
  }

  async function uploadImageFromUrl(url: string, bId: string, courseName: string): Promise<string | null> {
    try {
      const res = await fetch("/api/import-course-image", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ imageUrl: url, brandId: bId, courseName }),
      });
      const json = await res.json();
      return res.ok ? json.publicUrl : null;
    } catch { return null; }
  }

  function handleImageFileChange(file: File) {
    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (e) => setImagePreview(e.target?.result as string);
    reader.readAsDataURL(file);
  }

  async function save() {
    if (!name.trim()) { setMsg({ ok: false, text: "El nombre es obligatorio." }); return; }
    if (!price || Number(price) <= 0) { setMsg({ ok: false, text: "El precio es obligatorio." }); return; }
    if (!brandId) return;
    setSaving(true); setMsg(null);

    await ensureCategory(category);

    let finalImageUrl = imageUrl.trim() || null;

    if (imageFile) {
      setUploadingImage(true);
      const uploaded = await uploadImageFile(imageFile, brandId, name);
      setUploadingImage(false);
      if (uploaded) finalImageUrl = uploaded;
    } else if (imageUrl.trim().startsWith("http")) {
      setUploadingImage(true);
      const imported = await uploadImageFromUrl(imageUrl.trim(), brandId, name);
      setUploadingImage(false);
      if (imported) finalImageUrl = imported;
    }

    const { error } = await supabase.from("courses").insert({
      brand_id: brandId,
      name: name.trim(),
      description: description.trim() || null,
      price: Number(price),
      discount_price: discount ? Number(discount) : null,
      category: category.trim() || null,
      image_url: finalImageUrl,
      active,
    });

    setSaving(false);
    if (error) { setMsg({ ok: false, text: "Error: " + error.message }); return; }
    setMsg({ ok: true, text: "Curso creado correctamente." });
    setTimeout(() => router.push("/brand/courses"), 1200);
  }

  function normalizeBulkRow(raw: any, index: number): BulkCourseRow {
    const clean: any = {};
    for (const key of Object.keys(raw || {})) clean[normalizeHeader(key)] = raw[key];
    const errors: string[] = [];
    const name = String(clean.name || "").trim();
    const category = String(clean.category || clean.categoria || "").trim();
    const description = String(clean.description || clean.descripcion || "").trim();
    const image_url = String(clean.image_url || clean.imagen || clean.image || "").trim();
    const price = parseMoney(clean.price || clean.precio);
    const discount_price = (clean.discount_price || clean.precio_descuento) ? parseMoney(clean.discount_price || clean.precio_descuento) : null;
    if (!name) errors.push("Falta nombre");
    if (!category) errors.push("Falta categoria");
    if (!Number.isFinite(price) || price <= 0) errors.push("Precio invalido");
    return { rowNumber: index + 2, name, category, description, price, discount_price, image_url, errors };
  }

  function validateColumns(rows: any[]) {
    if (!rows.length) return ["El archivo esta vacio."];
    const headers = Object.keys(rows[0] || {}).map(normalizeHeader);
    const required = ["name", "category", "price"];
    const missing = required.filter((c) => !headers.includes(c));
    return missing.length > 0 ? [`Faltan columnas requeridas: ${missing.join(", ")}`] : [];
  }

  function parseCSV(file: File) {
    setBulkParsing(true); setBulkFileName(file.name); setBulkRows([]);
    Papa.parse(file, {
      header: true, skipEmptyLines: true,
      complete: (results: any) => {
        const rawRows = results.data || [];
        const colErrors = validateColumns(rawRows);
        if (colErrors.length > 0) {
          setBulkRows([{ rowNumber: 1, name: "", category: "", description: "", price: 0, discount_price: null, image_url: "", errors: colErrors }]);
          setBulkParsing(false); return;
        }
        setBulkRows(rawRows.map((r: any, i: number) => normalizeBulkRow(r, i)));
        setBulkParsing(false);
      },
      error: (error: any) => {
        setBulkRows([{ rowNumber: 1, name: "", category: "", description: "", price: 0, discount_price: null, image_url: "", errors: [error.message] }]);
        setBulkParsing(false);
      },
    });
  }

  const bulkValidRows = useMemo(() => bulkRows.filter((r) => r.errors.length === 0), [bulkRows]);
  const bulkInvalidRows = useMemo(() => bulkRows.filter((r) => r.errors.length > 0), [bulkRows]);

  async function confirmBulkUpload() {
    if (!brandId) return;
    if (bulkInvalidRows.length > 0) { alert("Corrige los errores antes de confirmar."); return; }
    if (bulkValidRows.length === 0) { alert("No hay cursos validos para cargar."); return; }
    if (!confirm(`Se cargaran ${bulkValidRows.length} cursos.\n\nConfirmar?`)) return;
    setBulkSaving(true);
    try {
      const uniqueCats = Array.from(new Set(bulkValidRows.map((r) => r.category.trim()).filter(Boolean)));
      for (const cat of uniqueCats) await ensureCategory(cat);
      let created = 0;
      for (const row of bulkValidRows) {
        let finalImageUrl: string | null = row.image_url || null;
        if (finalImageUrl && finalImageUrl.startsWith("http")) {
          const imported = await uploadImageFromUrl(finalImageUrl, brandId, row.name);
          if (imported) finalImageUrl = imported;
        }
        const { error } = await supabase.from("courses").insert({
          brand_id: brandId, name: row.name, description: row.description || null,
          price: row.price, discount_price: row.discount_price || null,
          category: row.category || null, image_url: finalImageUrl, active: true,
        });
        if (error) throw new Error(`Error creando "${row.name}": ${error.message}`);
        created++;
      }
      alert(`Carga completada. Creados: ${created}`);
      setBulkRows([]); setBulkFileName("");
      router.push("/brand/courses");
    } catch (e: any) {
      alert(e?.message || "Error en carga masiva.");
    } finally { setBulkSaving(false); }
  }

  function downloadTemplateCSV() {
    const csv = "name,category,description,price,discount_price,image_url\n" +
      '"Marketing Digital Avanzado",Marketing,"Aprende estrategias de marketing digital",350000,299000,https://imagen-del-curso.jpg\n';
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "plantilla-cursos.csv"; a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Cursos</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Crear curso</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Crea cursos manualmente o mediante carga masiva CSV</p>
        </div>
        <button onClick={() => router.push("/brand/courses")}
          className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Volver
        </button>
      </div>

      {msg && <div className="px-4 py-3 rounded-xl text-sm font-semibold"
        style={{ backgroundColor: msg.ok ? "#DCFCE7" : "#FEE2E2", color: msg.ok ? "#16A34A" : "#DC2626" }}>{msg.text}</div>}

      {/* CSV */}
      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Carga masiva CSV</p>
            <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Sube un CSV con multiples cursos</p>
          </div>
          <button onClick={downloadTemplateCSV}
            className="px-4 py-2 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
            Descargar plantilla
          </button>
        </div>

        <div className="rounded-xl p-4 cursor-pointer"
          style={{ border: "1.5px dashed var(--nomi-teal)", backgroundColor: "var(--nomi-teal-bg)" }}
          onClick={() => fileInputRef.current?.click()}>
          <input ref={fileInputRef} type="file" accept=".csv" className="hidden"
            onChange={(e) => { const f = e.target.files?.[0]; if (f) parseCSV(f); }} />
          <p className="text-sm font-semibold text-center" style={{ color: "var(--nomi-teal)" }}>
            {bulkParsing ? "Leyendo archivo..." : bulkFileName ? `Archivo: ${bulkFileName}` : "Haz clic para subir un CSV"}
          </p>
          <p className="text-xs text-center mt-1" style={{ color: "var(--nomi-muted)" }}>
            Columnas requeridas: <b>name, category, price</b> · Opcionales: description, discount_price, image_url
          </p>
        </div>

        {bulkRows.length > 0 && (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-sm" style={{ color: "var(--nomi-navy)" }}>
                <b style={{ color: "var(--nomi-teal)" }}>{bulkValidRows.length}</b> validos ·{" "}
                <b style={{ color: "#DC2626" }}>{bulkInvalidRows.length}</b> con errores
              </p>
              <div className="flex gap-2">
                <button onClick={() => { setBulkRows([]); setBulkFileName(""); }}
                  className="px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                  Cancelar
                </button>
                <button onClick={confirmBulkUpload} disabled={bulkSaving || bulkInvalidRows.length > 0}
                  className="px-4 py-1.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                  style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                  {bulkSaving ? "Cargando..." : "Confirmar carga"}
                </button>
              </div>
            </div>
            <div className="overflow-x-auto rounded-xl" style={{ border: "1.5px solid var(--nomi-border)" }}>
              <table className="w-full text-sm">
                <thead style={{ backgroundColor: "var(--nomi-gray)", borderBottom: "1px solid var(--nomi-border)" }}>
                  <tr>
                    {["Fila", "Nombre", "Categoria", "Precio", "Estado"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--nomi-muted)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.slice(0, 50).map((r) => (
                    <tr key={r.rowNumber} style={{ borderBottom: "1px solid var(--nomi-border)", backgroundColor: r.errors.length > 0 ? "#FEF2F2" : "#fff" }}>
                      <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.rowNumber}</td>
                      <td className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--nomi-navy)" }}>{r.name || "—"}</td>
                      <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.category || "—"}</td>
                      <td className="px-3 py-2 text-xs font-bold" style={{ color: "var(--nomi-navy)" }}>{Number.isFinite(r.price) ? money(r.price) : "—"}</td>
                      <td className="px-3 py-2 text-xs">
                        {r.errors.length > 0
                          ? <span style={{ color: "#DC2626" }}>{r.errors.join(", ")}</span>
                          : <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>Listo</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* FORMULARIO MANUAL */}
      <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Crear manualmente</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre del curso *</label>
            <input style={IS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Ej: Marketing digital avanzado" />
          </div>

          <div className="relative">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Categoria</label>
            <input style={IS} value={category}
              onChange={(e) => { setCategory(e.target.value); setShowCatSuggestions(true); }}
              onFocus={() => setShowCatSuggestions(true)}
              onBlur={() => setTimeout(() => setShowCatSuggestions(false), 200)}
              placeholder="Escribe o selecciona una categoria" />
            {showCatSuggestions && catSuggestions.length > 0 && (
              <div className="absolute top-full left-0 right-0 z-20 rounded-xl shadow-xl overflow-hidden mt-1"
                style={{ backgroundColor: "#fff", border: "1.5px solid var(--nomi-border)" }}>
                {catSuggestions.map((c) => (
                  <button key={c} type="button"
                    onMouseDown={() => { setCategory(c); setShowCatSuggestions(false); }}
                    className="w-full text-left px-4 py-2.5 text-sm hover:bg-slate-50 cursor-pointer"
                    style={{ color: "var(--nomi-navy)", borderBottom: "1px solid var(--nomi-border)" }}>
                    {c}
                  </button>
                ))}
              </div>
            )}
            {category && !existingCategories.some((c) => c.toLowerCase() === category.toLowerCase()) && (
              <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-teal)" }}>
                Se creara la categoria "{category}"
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio *</label>
            <input style={IS} value={price} onChange={(e) => setPrice(e.target.value)} placeholder="0" type="number" />
            {price && <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-teal)" }}>{money(Number(price))}</p>}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Precio con descuento</label>
            <input style={IS} value={discount} onChange={(e) => setDiscount(e.target.value)} placeholder="0" type="number" />
            {discount && <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-orange)" }}>{money(Number(discount))}</p>}
          </div>

          <div className="md:col-span-2">
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Descripcion</label>
            <textarea style={{ ...IS, resize: "vertical" }} rows={3} value={description} onChange={(e) => setDescription(e.target.value)} placeholder="Describe el contenido del curso..." />
          </div>

          <div className="md:col-span-2 space-y-3">
            <label className="block text-xs font-bold uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Imagen del curso</label>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <p className="text-xs mb-1.5" style={{ color: "var(--nomi-muted)" }}>Opcion 1: URL de imagen</p>
                <input style={IS} value={imageUrl}
                  onChange={(e) => { setImageUrl(e.target.value); setImageFile(null); setImagePreview(null); }}
                  placeholder="https://imagen-del-curso.jpg" />
              </div>
              <div>
                <p className="text-xs mb-1.5" style={{ color: "var(--nomi-muted)" }}>Opcion 2: Subir archivo</p>
                <label className="flex items-center gap-2 px-4 py-2.5 rounded-xl cursor-pointer"
                  style={{ border: "1.5px dashed var(--nomi-teal)", backgroundColor: "var(--nomi-teal-bg)" }}>
                  <span className="text-sm font-semibold" style={{ color: "var(--nomi-teal)" }}>
                    {imageFile ? imageFile.name : "Seleccionar imagen"}
                  </span>
                  <input ref={imageFileRef} type="file" accept="image/*" className="hidden"
                    onChange={(e) => { const f = e.target.files?.[0]; if (f) { handleImageFileChange(f); setImageUrl(""); } }} />
                </label>
              </div>
            </div>
            {(imagePreview || imageUrl) && (
              <img src={imagePreview || imageUrl} className="h-32 rounded-xl object-cover" alt="preview"
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            )}
          </div>
        </div>

        <label className="flex items-center gap-3 cursor-pointer">
          <div onClick={() => setActive(!active)}
            className="w-10 h-6 rounded-full transition-all relative cursor-pointer"
            style={{ backgroundColor: active ? "var(--nomi-teal)" : "var(--nomi-border)" }}>
            <div className="w-4 h-4 bg-white rounded-full absolute top-1 transition-all"
              style={{ left: active ? "22px" : "4px" }} />
          </div>
          <span className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>
            Curso {active ? "activo" : "inactivo"}
          </span>
        </label>
      </div>

      <div className="flex gap-3 pb-6">
        <button onClick={save} disabled={saving || uploadingImage}
          className="flex-1 py-3.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          {uploadingImage ? "Subiendo imagen..." : saving ? "Guardando..." : "Crear curso"}
        </button>
        <button onClick={() => router.push("/brand/courses")}
          className="px-6 py-3.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Cancelar
        </button>
      </div>
    </div>
  );
}
