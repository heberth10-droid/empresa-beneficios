"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Warehouse, Plus, Star, Pencil, Trash2, X, Save } from "lucide-react";

type WarehouseRow = {
  id: string;
  name: string;
  contact_name: string | null;
  contact_phone: string | null;
  contact_email: string | null;
  address: string;
  internal_number: string | null;
  reference: string | null;
  city: string;
  department: string;
  country: string;
  is_default: boolean;
  active: boolean;
};

const emptyForm = {
  name: "",
  contact_name: "",
  contact_phone: "",
  contact_email: "",
  address: "",
  internal_number: "",
  reference: "",
  city: "",
  department: "",
};

export default function BrandWarehousesPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [warehouses, setWarehouses] = useState<WarehouseRow[]>([]);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userRow, error: userErr } = await supabase
        .from("users").select("brand_id").eq("auth_id", user.id).single();
      if (userErr || !userRow?.brand_id) { router.push("/login"); return; }

      setBrandId(userRow.brand_id);

      const { data: whs } = await supabase
        .from("brand_warehouses")
        .select("*")
        .eq("brand_id", userRow.brand_id)
        .eq("active", true)
        .order("is_default", { ascending: false })
        .order("created_at", { ascending: true });

      setWarehouses(whs || []);
      setLoading(false);
    }
    load();
  }, [router]);

  function openNew() {
    setEditingId(null);
    setForm(emptyForm);
    setShowForm(true);
    setMsg(null);
  }

  function openEdit(w: WarehouseRow) {
    setEditingId(w.id);
    setForm({
      name: w.name,
      contact_name: w.contact_name || "",
      contact_phone: w.contact_phone || "",
      contact_email: w.contact_email || "",
      address: w.address,
      internal_number: w.internal_number || "",
      reference: w.reference || "",
      city: w.city,
      department: w.department,
    });
    setShowForm(true);
    setMsg(null);
  }

  async function refreshList() {
    if (!brandId) return;
    const { data: whs } = await supabase
      .from("brand_warehouses")
      .select("*")
      .eq("brand_id", brandId)
      .eq("active", true)
      .order("is_default", { ascending: false })
      .order("created_at", { ascending: true });
    setWarehouses(whs || []);
  }

  async function handleSave() {
    if (!brandId) return;
    if (!form.name.trim() || !form.address.trim() || !form.city.trim() || !form.department.trim()) {
      setMsg({ ok: false, text: "Nombre, direccion, ciudad y departamento son obligatorios" });
      return;
    }

    setSaving(true); setMsg(null);
    try {
      const payload = {
        brand_id: brandId,
        name: form.name.trim(),
        contact_name: form.contact_name.trim() || null,
        contact_phone: form.contact_phone.trim() || null,
        contact_email: form.contact_email.trim() || null,
        address: form.address.trim(),
        internal_number: form.internal_number.trim() || null,
        reference: form.reference.trim() || null,
        city: form.city.trim(),
        department: form.department.trim(),
        country: "CO",
        updated_at: new Date().toISOString(),
      };

      if (editingId) {
        const { error } = await supabase.from("brand_warehouses")
          .update(payload).eq("id", editingId);
        if (error) throw new Error(error.message);
      } else {
        const { error } = await supabase.from("brand_warehouses")
          .insert({ ...payload, is_default: warehouses.length === 0 });
        if (error) throw new Error(error.message);
      }

      setMsg({ ok: true, text: "Bodega guardada correctamente" });
      setShowForm(false);
      await refreshList();
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Error guardando la bodega" });
    } finally {
      setSaving(false);
    }
  }

  async function handleSetDefault(id: string) {
    if (!brandId) return;
    setMsg(null);
    await supabase.from("brand_warehouses").update({ is_default: false }).eq("brand_id", brandId);
    const { error } = await supabase.from("brand_warehouses").update({ is_default: true }).eq("id", id);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    await refreshList();
  }

  async function handleDelete(id: string) {
    if (!confirm("Eliminar esta bodega? Esta accion no se puede deshacer.")) return;
    const { error } = await supabase.from("brand_warehouses").update({ active: false }).eq("id", id);
    if (error) { setMsg({ ok: false, text: error.message }); return; }
    await refreshList();
  }

  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
    borderRadius: "10px", padding: "10px 14px", fontSize: "14px",
    outline: "none", width: "100%",
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>Logistica</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mis bodegas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            Direcciones desde donde despachas tus envios
          </p>
        </div>
        <button onClick={openNew}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-black cursor-pointer shrink-0"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          <Plus className="w-4 h-4" />
          Nueva bodega
        </button>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={msg.ok
            ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
            : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {msg.text}
        </div>
      )}

      {warehouses.length === 0 && !showForm && (
        <div className="bg-white rounded-2xl p-10 text-center"
          style={{ border: "1.5px dashed var(--nomi-border)" }}>
          <Warehouse className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-muted)" }} />
          <p className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
            Aun no tienes bodegas registradas
          </p>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            Crea tu primera bodega para poder generar guias de envio
          </p>
        </div>
      )}

      <div className="space-y-3">
        {warehouses.map((w) => (
          <div key={w.id} className="bg-white rounded-2xl p-5"
            style={{ border: "1.5px solid var(--nomi-border)" }}>
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3 min-w-0">
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--nomi-navy)" }}>
                  <Warehouse className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                      {w.name}
                    </span>
                    {w.is_default && (
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full flex items-center gap-1"
                        style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
                        <Star className="w-3 h-3" fill="currentColor" />
                        Predeterminada
                      </span>
                    )}
                  </div>
                  <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
                    {w.address}{w.internal_number ? `, ${w.internal_number}` : ""} — {w.city}, {w.department}
                  </p>
                  {(w.contact_name || w.contact_phone) && (
                    <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>
                      {w.contact_name} {w.contact_phone ? `· ${w.contact_phone}` : ""}
                    </p>
                  )}
                </div>
              </div>

              <div className="flex items-center gap-1 shrink-0">
                {!w.is_default && (
                  <button onClick={() => handleSetDefault(w.id)} title="Hacer predeterminada"
                    className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                    style={{ color: "var(--nomi-muted)" }}>
                    <Star className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => openEdit(w)} title="Editar"
                  className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ color: "var(--nomi-teal)" }}>
                  <Pencil className="w-4 h-4" />
                </button>
                <button onClick={() => handleDelete(w.id)} title="Eliminar"
                  className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                  style={{ color: "#DC2626" }}>
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      {showForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}>
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="font-black text-lg" style={{ color: "var(--nomi-navy)" }}>
                {editingId ? "Editar bodega" : "Nueva bodega"}
              </h2>
              <button onClick={() => setShowForm(false)}
                className="w-8 h-8 flex items-center justify-center rounded-lg cursor-pointer"
                style={{ backgroundColor: "var(--nomi-gray)" }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                style={{ color: "var(--nomi-navy)" }}>Nombre / alias *</label>
              <input style={inputStyle} value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Bodega Principal Cali" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Contacto</label>
                <input style={inputStyle} value={form.contact_name}
                  onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  placeholder="Nombre del contacto" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Telefono</label>
                <input style={inputStyle} value={form.contact_phone}
                  onChange={(e) => setForm({ ...form, contact_phone: e.target.value })}
                  placeholder="3001234567" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                style={{ color: "var(--nomi-navy)" }}>Correo de contacto</label>
              <input style={inputStyle} value={form.contact_email}
                onChange={(e) => setForm({ ...form, contact_email: e.target.value })}
                placeholder="bodega@tuempresa.com" />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-2">
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Direccion *</label>
                <input style={inputStyle} value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="Carrera 7 71-21" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Apto/Local</label>
                <input style={inputStyle} value={form.internal_number}
                  onChange={(e) => setForm({ ...form, internal_number: e.target.value })}
                  placeholder="301" />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                style={{ color: "var(--nomi-navy)" }}>Referencia</label>
              <input style={inputStyle} value={form.reference}
                onChange={(e) => setForm({ ...form, reference: e.target.value })}
                placeholder="Torre Central, edificio azul" />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Ciudad *</label>
                <input style={inputStyle} value={form.city}
                  onChange={(e) => setForm({ ...form, city: e.target.value })}
                  placeholder="Cali" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>Departamento *</label>
                <input style={inputStyle} value={form.department}
                  onChange={(e) => setForm({ ...form, department: e.target.value })}
                  placeholder="Valle del Cauca" />
              </div>
            </div>

            {msg && !msg.ok && (
              <div className="px-4 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {msg.text}
              </div>
            )}

            <button onClick={handleSave} disabled={saving}
              className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              <Save className="w-4 h-4" />
              {saving ? "Guardando..." : "Guardar bodega"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
