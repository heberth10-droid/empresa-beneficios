"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

export default function EmployeeSettingsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [employeeId, setEmployeeId] = useState<string | null>(null);

  // Form fields
  const [phone, setPhone] = useState("");
  const [newEmail, setNewEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);
      setMsg(null);

      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      setNewEmail(user.email || "");

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("role, company_id")
        .eq("auth_id", user.id)
        .single();

      if (userErr || !userRow || userRow.role !== "EMPLOYEE" || !userRow.company_id) {
        router.push("/login");
        return;
      }

      setCompanyId(userRow.company_id);

      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("id, phone, email")
        .eq("company_id", userRow.company_id)
        .eq("email", user.email)
        .single();

      if (empErr || !emp) {
        setErr("No se encontró tu registro de empleado para configuración.");
        setLoading(false);
        return;
      }

      setEmployeeId(emp.id);
      setPhone(emp.phone || "");
      setLoading(false);
    }

    load();
  }, [router]);

  async function savePhone() {
    if (!employeeId) return;
    setSaving(true);
    setErr(null);
    setMsg(null);

    const { error } = await supabase
      .from("employees")
      .update({ phone })
      .eq("id", employeeId);

    setSaving(false);

    if (error) {
      setErr("No se pudo guardar el celular: " + error.message);
      return;
    }

    setMsg("Celular actualizado correctamente.");
  }

  async function changeEmail() {
    setSaving(true);
    setErr(null);
    setMsg(null);

    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;
    if (!user) {
      setSaving(false);
      router.push("/login");
      return;
    }

    // 1) Cambiar email en Auth (normalmente requiere confirmación por correo)
    const { error: authErr } = await supabase.auth.updateUser({ email: newEmail });
    if (authErr) {
      setSaving(false);
      setErr("No se pudo cambiar el correo: " + authErr.message);
      return;
    }

    // 2) Intentar actualizar employees.email (para mantener sincronía)
    // Nota: si Supabase exige confirmación, el email “real” del user cambia después de confirmar.
    // Aun así dejamos la tabla alineada con el email solicitado.
    if (companyId) {
      await supabase
        .from("employees")
        .update({ email: newEmail })
        .eq("company_id", companyId)
        .eq("email", user.email);
    }

    setSaving(false);
    setMsg(
      "Solicitud de cambio de correo enviada. Revisa tu email para confirmar el cambio (si Supabase lo requiere)."
    );
  }

  async function changePassword() {
    if (!newPassword || newPassword.length < 6) {
      setErr("La contraseña debe tener mínimo 6 caracteres.");
      return;
    }

    setSaving(true);
    setErr(null);
    setMsg(null);

    const { error } = await supabase.auth.updateUser({ password: newPassword });

    setSaving(false);

    if (error) {
      setErr("No se pudo cambiar la contraseña: " + error.message);
      return;
    }

    setNewPassword("");
    setMsg("Contraseña actualizada correctamente.");
  }

  if (loading) return <div className="text-slate-300">Cargando configuración...</div>;

  return (
    <div className="max-w-3xl space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-slate-400 text-sm">Actualiza tus datos y seguridad.</p>
      </div>

      {err && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {err}
        </div>
      )}

      {msg && (
        <div className="bg-emerald-500/15 border border-emerald-500/30 text-emerald-200 rounded p-3 text-sm">
          {msg}
        </div>
      )}

      {/* Celular */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 space-y-3">
        <div className="font-semibold">Datos de contacto</div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Celular</label>
          <input
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="Ej: +57 300 123 4567"
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={savePhone}
          disabled={saving}
          className="px-4 py-2 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition disabled:opacity-60"
        >
          Guardar celular
        </button>
      </div>

      {/* Email */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 space-y-3">
        <div className="font-semibold">Correo</div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Nuevo correo</label>
          <input
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
          />
          <div className="text-xs text-slate-500">
            * Es posible que Supabase te pida confirmar el cambio por email.
          </div>
        </div>

        <button
          onClick={changeEmail}
          disabled={saving}
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 transition disabled:opacity-60"
        >
          Cambiar correo
        </button>
      </div>

      {/* Password */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 space-y-3">
        <div className="font-semibold">Seguridad</div>

        <div className="space-y-2">
          <label className="text-xs text-slate-400">Nueva contraseña</label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Mínimo 6 caracteres"
            className="w-full bg-slate-950 border border-slate-800 rounded px-3 py-2 text-sm"
          />
        </div>

        <button
          onClick={changePassword}
          disabled={saving}
          className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 transition disabled:opacity-60"
        >
          Cambiar contraseña
        </button>
      </div>
    </div>
  );
}