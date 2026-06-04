"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Save, User } from "lucide-react";

export default function BrandProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  const [userData, setUserData] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);

  // Campos editables
  const [userName, setUserName] = useState("");
  const [userEmail, setUserEmail] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandNit, setBrandNit] = useState("");

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase.from("users").select("*").eq("auth_id", user.id).single();
      if (error || !data) { router.push("/login"); return; }

      setUserData(data);
      setUserName(data.name || "");
      setUserEmail(data.email || user.email || "");

      if (data.brand_id) {
        const { data: brandData } = await supabase.from("brands").select("*").eq("id", data.brand_id).single();
        if (brandData) {
          setBrand(brandData);
          setBrandName(brandData.name || "");
          setBrandNit(brandData.nit || "");
        }
      }
      setLoading(false);
    }
    loadProfile();
  }, [router]);

  async function handleSave() {
    setSaving(true); setMsg(null);
    try {
      const { error: userErr } = await supabase.from("users")
        .update({ name: userName.trim() }).eq("auth_id", userData.auth_id);
      if (userErr) throw new Error("Error actualizando usuario: " + userErr.message);

      if (brand) {
        const { error: brandErr } = await supabase.from("brands")
          .update({ name: brandName.trim(), nit: brandNit.trim() }).eq("id", brand.id);
        if (brandErr) throw new Error("Error actualizando marca: " + brandErr.message);
      }

      setMsg({ ok: true, text: "Cambios guardados correctamente" });
    } catch (e: any) {
      setMsg({ ok: false, text: e.message || "Error guardando cambios" });
    } finally { setSaving(false); }
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
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Cuenta</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mi perfil</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Edita tus datos personales y los de tu marca
        </p>
      </div>

      {/* AVATAR */}
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--nomi-navy)" }}>
          <User className="w-7 h-7 text-white" />
        </div>
        <div>
          <div className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
            {userName || "Sin nombre"}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
            {userData?.role}
          </span>
        </div>
      </div>

      {msg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={msg.ok
            ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
            : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {msg.text}
        </div>
      )}

      {/* DATOS PERSONALES */}
      <div className="bg-white rounded-2xl p-6 space-y-4"
        style={{ border: "1.5px solid var(--nomi-border)" }}>
        <h2 className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
          Datos personales
        </h2>

        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--nomi-navy)" }}>Nombre</label>
          <input style={inputStyle} value={userName}
            onChange={(e) => setUserName(e.target.value)} placeholder="Tu nombre" />
        </div>

        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--nomi-navy)" }}>Correo electronico</label>
          <input style={inputStyle} value={userEmail}
            onChange={(e) => setUserEmail(e.target.value)} placeholder="tu@correo.com" />
          <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>
            Cambiar el correo puede afectar el inicio de sesion
          </p>
        </div>

        {/* READ ONLY */}
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--nomi-muted)" }}>Rol (no editable)</label>
          <div className="px-4 py-2.5 rounded-xl text-sm font-semibold"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
            {userData?.role}
          </div>
        </div>
      </div>

      {/* DATOS MARCA */}
      {brand && (
        <div className="bg-white rounded-2xl p-6 space-y-4"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <h2 className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
            Datos de la marca
          </h2>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>Nombre de la marca</label>
            <input style={inputStyle} value={brandName}
              onChange={(e) => setBrandName(e.target.value)} placeholder="Nombre de tu marca" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
              style={{ color: "var(--nomi-navy)" }}>NIT</label>
            <input style={inputStyle} value={brandNit}
              onChange={(e) => setBrandNit(e.target.value)} placeholder="900.123.456-7" />
          </div>
        </div>
      )}

      <button onClick={handleSave} disabled={saving}
        className="w-full flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60"
        style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
        <Save className="w-4 h-4" />
        {saving ? "Guardando..." : "Guardar cambios"}
      </button>
    </div>
  );
}
