"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const DOC_TYPES = ["CC", "CE", "NIT", "PAS"] as const;

type Employee = {
  id: string;
  company_id: string | null;
  name: string | null;
  document_type: string;
  document_number: string;
  email?: string | null;
  active: boolean;
  credit_limit: number;
  max_installments: number;
};

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

export default function CompanyEmployeesPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [companyId, setCompanyId] = useState<string | null>(null);
  const [rows, setRows] = useState<Employee[]>([]);

  // Form
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState("");

  const [docType, setDocType] = useState<(typeof DOC_TYPES)[number]>("CC");
  const [docNumber, setDocNumber] = useState("");

  // Credenciales del empleado (solo para crear)
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [active, setActive] = useState(true);
  const [creditLimit, setCreditLimit] = useState<number>(50000);
  const [maxInstallments, setMaxInstallments] = useState<number>(6);

  const isEditing = useMemo(() => !!editingId, [editingId]);

  useEffect(() => {
    async function boot() {
      setErrorMsg(null);
      setOkMsg(null);

      const { data: userRes } = await supabase.auth.getUser();
      const authUser = userRes.user;

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: u, error: uErr } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUser.id)
        .single();

      if (uErr || !u) {
        router.push("/login");
        return;
      }

      if (u.role !== "COMPANY_ADMIN") {
        router.push("/login");
        return;
      }

      if (!u.company_id) {
        setErrorMsg("Tu usuario no tiene company_id asignado en la tabla users.");
        setLoading(false);
        return;
      }

      setCompanyId(u.company_id);

      await loadEmployees(u.company_id);
      setLoading(false);
    }

    boot();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [router]);

  async function loadEmployees(cId: string) {
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("employees")
      .select(
        "id, company_id, name, document_type, document_number, email, active, credit_limit, max_installments, created_at"
      )
      .eq("company_id", cId)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg("No se pudieron cargar los empleados: " + error.message);
      return;
    }

    setRows((data || []) as any);
  }

  function resetForm() {
    setEditingId(null);
    setName("");
    setDocType("CC");
    setDocNumber("");

    setEmail("");
    setPassword("");

    setActive(true);
    setCreditLimit(50000);
    setMaxInstallments(6);
  }

  function startEdit(emp: Employee) {
    setOkMsg(null);
    setErrorMsg(null);

    setEditingId(emp.id);
    setName(emp.name || "");
    setDocType((emp.document_type as any) || "CC");
    setDocNumber(emp.document_number || "");

    // En edición NO pedimos credenciales (no las cambiamos aquí)
    setEmail(emp.email || "");
    setPassword("");

    setActive(!!emp.active);
    setCreditLimit(Number(emp.credit_limit || 0));
    setMaxInstallments(Number(emp.max_installments || 1));
  }

  async function handleSave() {
    setErrorMsg(null);
    setOkMsg(null);

    if (!companyId) {
      setErrorMsg("No hay companyId.");
      return;
    }

    const cleanDoc = docNumber.trim();
    if (!cleanDoc) {
      setErrorMsg("Documento es obligatorio.");
      return;
    }

    // Validaciones básicas
    if (!isEditing) {
      const cleanEmail = email.trim().toLowerCase();
      if (!cleanEmail || !isValidEmail(cleanEmail)) {
        setErrorMsg("Correo inválido.");
        return;
      }
      if (!password || password.length < 8) {
        setErrorMsg("La contraseña debe tener mínimo 8 caracteres.");
        return;
      }
    }

    setSaving(true);

    // -------------------------
    // CREATE (Edge Function)
    // -------------------------
    if (!isEditing) {
      const payload = {
        name: name.trim() || "Empleado",
        document_type: docType,
        document_number: cleanDoc,
        email: email.trim().toLowerCase(),
        password,
        position: null,
        department: null,
        credit_limit: Number(creditLimit || 0),
        max_installments: Number(maxInstallments || 1),
        active,
      };

      const { data, error } = await supabase.functions.invoke(
        "create-employee-user",
        { body: payload }
      );

      setSaving(false);

      if (error) {
        setErrorMsg(
          "No se pudo crear el empleado (function): " +
            ((error as any)?.message || "Error desconocido")
        );
        return;
      }

      if (!data?.ok) {
        setErrorMsg(
          "No se pudo crear el empleado (function): " +
            (data?.error || "Respuesta inesperada")
        );
        return;
      }

      setOkMsg("✅ Empleado creado. Ya puede iniciar sesión con su correo y contraseña.");
      resetForm();
      await loadEmployees(companyId);
      return;
    }

    // -------------------------
    // UPDATE (direct employees)
    // -------------------------
    const { error } = await supabase
      .from("employees")
      .update({
        name: name.trim() || null,
        document_type: docType,
        document_number: cleanDoc,
        active,
        credit_limit: Number(creditLimit || 0),
        max_installments: Number(maxInstallments || 1),
      })
      .eq("id", editingId);

    setSaving(false);

    if (error) {
      setErrorMsg("No se pudo actualizar el empleado: " + error.message);
      return;
    }

    setOkMsg("✅ Empleado actualizado.");
    resetForm();
    await loadEmployees(companyId);
  }

  async function toggleActive(emp: Employee) {
    if (!companyId) return;

    setErrorMsg(null);
    setOkMsg(null);

    const { error } = await supabase
      .from("employees")
      .update({ active: !emp.active })
      .eq("id", emp.id);

    if (error) {
      setErrorMsg("No se pudo cambiar estado: " + error.message);
      return;
    }

    await loadEmployees(companyId);
  }

  async function deleteEmployee(emp: Employee) {
    if (!companyId) return;

    setErrorMsg(null);
    setOkMsg(null);

    const ok = confirm(
      `¿Eliminar empleado ${emp.document_type} ${emp.document_number}?\n\nNota: esto borra el registro del empleado. (El usuario Auth se elimina después en hardening/admin).`
    );
    if (!ok) return;

    const { error } = await supabase.from("employees").delete().eq("id", emp.id);

    if (error) {
      setErrorMsg("No se pudo eliminar: " + error.message);
      return;
    }

    await loadEmployees(companyId);
  }

  if (loading) return <div className="text-slate-300">Cargando empleados...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Empleados</h1>
        <p className="text-slate-400 text-sm">
          Aquí defines cupo por cuota y máximo de cuotas. Esto controla el checkout.
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
      )}

      {okMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded p-3 text-sm">
          {okMsg}
        </div>
      )}

      {/* FORM */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">
            {isEditing ? "Editar empleado" : "Crear empleado"}
          </h2>

          {isEditing && (
            <button
              onClick={resetForm}
              className="text-sm text-slate-300 hover:text-white underline"
            >
              Cancelar edición
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Nombre (recomendado)"
            className="bg-slate-800 rounded px-3 py-2"
          />

          <div className="flex gap-2">
            <select
              value={docType}
              onChange={(e) => setDocType(e.target.value as any)}
              className="bg-slate-800 rounded px-3 py-2 w-28"
            >
              {DOC_TYPES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>

            <input
              value={docNumber}
              onChange={(e) => setDocNumber(e.target.value)}
              placeholder="Documento"
              className="bg-slate-800 rounded px-3 py-2 flex-1"
            />
          </div>

          {/* Credenciales solo en creación */}
          {!isEditing && (
            <>
              <input
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="Correo (para login del empleado)"
                className="bg-slate-800 rounded px-3 py-2"
              />

              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Contraseña (mín 8)"
                type="password"
                className="bg-slate-800 rounded px-3 py-2"
              />
            </>
          )}

          {isEditing && (
            <div className="md:col-span-2 text-xs text-slate-400">
              Nota: para cambiar correo/contraseña del empleado lo haremos luego en “hardening/admin”
              (esto toca Auth).
            </div>
          )}

          <input
            type="number"
            value={creditLimit}
            onChange={(e) => setCreditLimit(Number(e.target.value))}
            placeholder="Límite por cuota"
            className="bg-slate-800 rounded px-3 py-2"
            min={0}
          />

          <input
            type="number"
            value={maxInstallments}
            onChange={(e) => setMaxInstallments(Number(e.target.value))}
            placeholder="Máximo de cuotas"
            className="bg-slate-800 rounded px-3 py-2"
            min={1}
          />

          <label className="flex items-center gap-2 text-sm text-slate-300">
            <input
              type="checkbox"
              checked={active}
              onChange={(e) => setActive(e.target.checked)}
            />
            Activo
          </label>
        </div>

        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-emerald-500 text-slate-950 font-bold px-5 py-2 rounded hover:bg-emerald-400 transition disabled:opacity-60"
        >
          {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear empleado"}
        </button>
      </div>

      {/* LIST */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg overflow-hidden">
        <div className="p-4 border-b border-slate-800 flex items-center justify-between">
          <h2 className="font-semibold">Listado</h2>
          <div className="text-sm text-slate-400">{rows.length} empleados</div>
        </div>

        {rows.length === 0 ? (
          <div className="p-4 text-slate-400 text-sm">No hay empleados aún.</div>
        ) : (
          <div className="divide-y divide-slate-800">
            {rows.map((emp) => (
              <div
                key={emp.id}
                className="p-4 flex flex-col md:flex-row md:items-center gap-3"
              >
                <div className="flex-1">
                  <div className="font-semibold text-slate-100">
                    {emp.name || "Empleado"}
                  </div>

                  <div className="text-sm text-slate-400">
                    {emp.document_type} {emp.document_number} •{" "}
                    {emp.active ? "Activo" : "Inactivo"}
                    {emp.email ? (
                      <>
                        {" "}
                        <span className="text-slate-500">|</span>{" "}
                        <span className="text-slate-300">{emp.email}</span>
                      </>
                    ) : null}
                  </div>
                </div>

                <div className="text-sm text-slate-300 w-full md:w-auto">
                  <b>Límite/cuota:</b> ${Number(emp.credit_limit || 0).toFixed(0)}{" "}
                  <span className="text-slate-500">|</span>{" "}
                  <b>Máx cuotas:</b> {emp.max_installments}
                </div>

                <div className="flex gap-2">
                  <button
                    onClick={() => startEdit(emp)}
                    className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
                  >
                    Editar
                  </button>

                  <button
                    onClick={() => toggleActive(emp)}
                    className="px-3 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
                  >
                    {emp.active ? "Desactivar" : "Activar"}
                  </button>

                  <button
                    onClick={() => deleteEmployee(emp)}
                    className="px-3 py-2 rounded bg-red-500/20 hover:bg-red-500/30 text-red-200 text-sm"
                  >
                    Eliminar
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}