"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import EmployeeSidebar from "@/components/EmployeeSidebar";

export default function EmployeeSettingsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [docType, setDocType] = useState("");
  const [docNumber, setDocNumber] = useState("");
  const [empName, setEmpName] = useState("");

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userRow } = await supabase.from("users").select("role, company_id, employee_id").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE") { router.push("/login"); return; }

      let emp: any = null;
      if (userRow.employee_id) {
        const { data } = await supabase.from("employees").select("id, phone, email, document_type, document_number, name").eq("id", userRow.employee_id).single();
        emp = data;
      }
      if (!emp && user.email) {
        const { data } = await supabase.from("employees").select("id, phone, email, document_type, document_number, name").eq("company_id", userRow.company_id).eq("email", user.email).single();
        emp = data;
      }

      if (!emp) { setErr("No se encontro tu registro de empleado."); setLoading(false); return; }

      setEmployeeId(emp.id);
      setPhone(emp.phone || "");
      setNewEmail(emp.email || user.email || "");
      setDocType(emp.document_type || "");
      setDocNumber(emp.document_number || "");
      setEmpName(emp.name || "");
      setLoading(false);
    }
    load();
  }, [router]);

  async function savePhone() {
    if (!employeeId) return;
    setSaving(true); setErr(null); setMsg(null);
    const { error } = await supabase.from("employees").update({ phone }).eq("id", employeeId);
    setSaving(false);
    if (error) { setErr("No se pudo guardar el celular: " + error.message); return; }
    setMsg("Celular actualizado correctamente.");
  }

  async function changeEmail() {
    if (!employeeId) return;
    setSaving(true); setErr(null); setMsg(null);
    const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
    if (authErr) { setSaving(false); setErr("No se pudo cambiar el correo: " + authErr.message); return; }
    await supabase.from("employees").update({ email: newEmail }).eq("id", employeeId);
    setSaving(false);
    setMsg("Solicitud enviada. Revisa tu correo para confirmar el cambio.");
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 8) { setErr("La contrasena debe tener minimo 8 caracteres."); return; }
    setSaving(true); setErr(null); setMsg(null);
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    setSaving(false);
    if (error) { setErr("No se pudo cambiar la contrasena: " + error.message); return; }
    setNewPassword("");
    setMsg("Contrasena actualizada correctamente.");
  }

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="hidden md:flex"><EmployeeSidebar /></div>
      <main className="flex-1 p-6 md:p-8 space-y-6 max-w-2xl">

        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Mi portal</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mi perfil</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Actualiza tu informacion de contacto y seguridad</p>
        </div>

        {err && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{err}</div>}
        {msg && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>{msg}</div>}

        {/* DATOS NO EDITABLES */}
        <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Datos de identificacion</p>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre</label>
              <input value={empName} disabled style={{ ...IS, backgroundColor: "#f1f5f9", color: "var(--nomi-muted)" }} />
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Documento</label>
              <input value={`${docType} ${docNumber}`} disabled style={{ ...IS, backgroundColor: "#f1f5f9", color: "var(--nomi-muted)" }} />
            </div>
          </div>
          <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>Para cambiar estos datos contacta al administrador de tu empresa.</p>
        </div>

        {/* CELULAR */}
        <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Celular</p>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Numero de celular</label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} placeholder="Ej: 3001234567" style={IS} />
          </div>
          <button onClick={savePhone} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            {saving ? "Guardando..." : "Guardar celular"}
          </button>
        </div>

        {/* CORREO */}
        <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Correo electronico</p>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nuevo correo</label>
            <input value={newEmail} onChange={(e) => setNewEmail(e.target.value)} style={IS} />
            <p className="text-xs mt-1.5" style={{ color: "var(--nomi-muted)" }}>Es posible que debas confirmar el cambio desde tu correo actual.</p>
          </div>
          <button onClick={changeEmail} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
            {saving ? "Guardando..." : "Cambiar correo"}
          </button>
        </div>

        {/* CONTRASENA */}
        <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Seguridad</p>
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nueva contrasena</label>
            <input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} placeholder="Minimo 8 caracteres" style={IS} />
          </div>
          <button onClick={changePassword} disabled={saving}
            className="px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
            {saving ? "Guardando..." : "Cambiar contrasena"}
          </button>
        </div>

        <div className="pb-6">
          <Link href="/market"
            className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-teal)", color: "#fff" }}>
            Volver al marketplace
          </Link>
        </div>

      </main>
    </div>
  );
}
