"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Papa from "papaparse";
import { supabase } from "@/lib/supabaseClient";

const DOC_TYPES = ["CC", "CE"] as const;

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

type BulkEmployeeRow = {
  rowNumber: number;
  document_number: string;
  document_type: "CC" | "CE" | "";
  first_name: string;
  last_name: string;
  phone: string;
  address: string;
  city: string;
  email: string;
  salary: number;
  credit_limit: number;
  max_installments: number;
  errors: string[];
};

const REQUIRED_COLUMNS = [
  "documento",
  "tipo_documento",
  "nombre",
  "apellido",
  "celular",
  "direccion",
  "ciudad",
  "correo_electronico",
  "salario",
  "cupo_mensual_autorizado",
  "cuotas_autorizadas",
];

function isValidEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim().toLowerCase());
}

function normalizeHeader(value: string) {
  return String(value || "")
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
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
  const [creditLimit, setCreditLimit] = useState("");
  const [maxInstallments, setMaxInstallments] = useState("");

  // Carga masiva
  const [bulkRows, setBulkRows] = useState<BulkEmployeeRow[]>([]);
  const [bulkFileName, setBulkFileName] = useState("");
  const [bulkParsing, setBulkParsing] = useState(false);
  const [bulkSaving, setBulkSaving] = useState(false);

  const isEditing = useMemo(() => !!editingId, [editingId]);

  const bulkValidRows = useMemo(
    () => bulkRows.filter((r) => r.errors.length === 0),
    [bulkRows]
  );

  const bulkInvalidRows = useMemo(
    () => bulkRows.filter((r) => r.errors.length > 0),
    [bulkRows]
  );

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
    setCreditLimit("");
    setMaxInstallments("");
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
    setCreditLimit(String(Number(emp.credit_limit || 0)));
    setMaxInstallments(String(Number(emp.max_installments || 1)));
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

    if (!creditLimit || Number(creditLimit) < 0) {
      setErrorMsg("El cupo mensual autorizado es obligatorio.");
      return;
    }

    if (!maxInstallments || Number(maxInstallments) < 1) {
      setErrorMsg("Debes seleccionar las cuotas autorizadas.");
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

  function normalizeBulkRow(raw: any, index: number): BulkEmployeeRow {
    const clean: any = {};

    for (const key of Object.keys(raw || {})) {
      clean[normalizeHeader(key)] = raw[key];
    }

    const errors: string[] = [];

    const documentNumber = String(clean.documento || "").trim();
    const documentType = String(clean.tipo_documento || "")
      .trim()
      .toUpperCase() as "CC" | "CE" | "";
    const firstName = String(clean.nombre || "").trim();
    const lastName = String(clean.apellido || "").trim();
    const phone = String(clean.celular || "").trim();
    const address = String(clean.direccion || "").trim();
    const city = String(clean.ciudad || "").trim();
    const employeeEmail = String(clean.correo_electronico || "")
      .trim()
      .toLowerCase();

    const salary = parseMoney(clean.salario);
    const credit = parseMoney(clean.cupo_mensual_autorizado);
    const installments = Number(String(clean.cuotas_autorizadas || "").trim());

    if (!documentNumber) errors.push("Falta documento");
    if (!["CC", "CE"].includes(documentType)) errors.push("tipo_documento debe ser CC o CE");
    if (!firstName) errors.push("Falta nombre");
    if (!lastName) errors.push("Falta apellido");
    if (!phone) errors.push("Falta celular");
    if (!address) errors.push("Falta dirección");
    if (!city) errors.push("Falta ciudad");
    if (!employeeEmail || !isValidEmail(employeeEmail)) errors.push("correo_electronico inválido");
    if (!Number.isFinite(salary) || salary < 0) errors.push("salario inválido");
    if (!Number.isFinite(credit) || credit < 0) errors.push("cupo_mensual_autorizado inválido");
    if (!Number.isFinite(installments) || installments < 1) errors.push("cuotas_autorizadas inválidas");

    return {
      rowNumber: index + 2,
      document_number: documentNumber,
      document_type: documentType,
      first_name: firstName,
      last_name: lastName,
      phone,
      address,
      city,
      email: employeeEmail,
      salary,
      credit_limit: credit,
      max_installments: installments,
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
              document_number: "",
              document_type: "",
              first_name: "",
              last_name: "",
              phone: "",
              address: "",
              city: "",
              email: "",
              salary: 0,
              credit_limit: 0,
              max_installments: 0,
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
            document_number: "",
            document_type: "",
            first_name: "",
            last_name: "",
            phone: "",
            address: "",
            city: "",
            email: "",
            salary: 0,
            credit_limit: 0,
            max_installments: 0,
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

  function downloadTemplateCSV() {
    const csv =
      "documento,tipo_documento,nombre,apellido,celular,direccion,ciudad,correo_electronico,salario,cupo_mensual_autorizado,cuotas_autorizadas\n" +
      '123456789,CC,Camilo,Rincón,3001234567,"Calle 10 # 20-30",Cali,camilo@empresa.com,2500000,500000,6\n';

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.href = url;
    a.download = "plantilla-empleados-nova.csv";
    a.click();

    URL.revokeObjectURL(url);
  }

  async function confirmBulkUpload() {
    setErrorMsg(null);
    setOkMsg(null);

    if (!companyId) {
      setErrorMsg("No hay companyId.");
      return;
    }

    if (bulkInvalidRows.length > 0) {
      alert("Corrige los errores antes de confirmar la carga.");
      return;
    }

    if (bulkValidRows.length === 0) {
      alert("No hay empleados válidos para cargar.");
      return;
    }

    const ok = confirm(
      `Se cargarán ${bulkValidRows.length} empleados.\n\nSi el documento ya existe en esta empresa, se actualizará. Si no existe, se creará.\n\n¿Confirmar carga?`
    );

    if (!ok) return;

    setBulkSaving(true);

    try {
      const { data: existingEmployees, error: existingErr } = await supabase
        .from("employees")
        .select("id, document_type, document_number")
        .eq("company_id", companyId);

      if (existingErr) throw new Error(existingErr.message);

      const existingMap = new Map<string, string>();

      for (const emp of existingEmployees || []) {
        existingMap.set(
          `${String(emp.document_type).trim().toUpperCase()}::${String(emp.document_number).trim()}`,
          emp.id
        );
      }

      let created = 0;
      let updated = 0;

      for (const row of bulkValidRows) {
        const key = `${row.document_type}::${row.document_number}`;
        const existingId = existingMap.get(key);

        const fullName = `${row.first_name} ${row.last_name}`.trim();

        const payload = {
          company_id: companyId,
          document_type: row.document_type,
          document_number: row.document_number,
          name: fullName,
          first_name: row.first_name,
          last_name: row.last_name,
          phone: row.phone,
          address: row.address,
          city: row.city,
          email: row.email,
          salary: row.salary,
          credit_limit: row.credit_limit,
          max_installments: row.max_installments,
          active: true,
        };

        if (existingId) {
          const { error } = await supabase
            .from("employees")
            .update(payload)
            .eq("id", existingId)
            .eq("company_id", companyId);

          if (error) {
            throw new Error(
              `Error actualizando empleado ${row.document_number}: ${error.message}`
            );
          }

          updated++;
        } else {
          const { error } = await supabase.from("employees").insert(payload);

          if (error) {
            throw new Error(
              `Error creando empleado ${row.document_number}: ${error.message}`
            );
          }

          created++;
        }
      }

      await loadEmployees(companyId);

      alert(`Carga completada.\nCreados: ${created}\nActualizados: ${updated}`);

      setBulkRows([]);
      setBulkFileName("");
      setOkMsg(`✅ Carga masiva completada. Creados: ${created}. Actualizados: ${updated}.`);
    } catch (e: any) {
      setErrorMsg(e?.message || "Error en carga masiva.");
      console.error(e);
    } finally {
      setBulkSaving(false);
    }
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
      `¿Eliminar empleado ${emp.document_type} ${emp.document_number}?\n\nNota: esto borra el registro del empleado. El usuario Auth se elimina despues.`
    );
    if (!ok) return;

    const { error } = await supabase.from("employees").delete().eq("id", emp.id);

    if (error) {
      setErrorMsg("No se pudo eliminar: " + error.message);
      return;
    }

    await loadEmployees(companyId);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w4 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Empleados</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Define cupo mensual autorizado y maximo de cuotas por empleado
        </p>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {errorMsg}
        </div>
      )}
      {okMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
          {okMsg}
        </div>
      )}

      {/* CARGA MASIVA */}
      <div className="bg-white rounded-2xl p-6 space-y-5" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Carga masiva de empleados</h2>
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
            Columnas requeridas: <b>documento, tipo_documento, nombre, apellido, celular, direccion, ciudad, correo_electronico, salario, cupo_mensual_autorizado, cuotas_autorizadas</b>
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
                    {["Fila","Documento","Tipo","Nombre","Celular","Correo","Ciudad","Salario","Cupo","Cuotas","Estado"].map(h => (
                      <th key={h} className="px-3 py-2.5 text-left text-xs font-bold uppercase tracking-wide" style={{ color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {bulkRows.slice(0, 50).map((r) => {
                    const hasErr = r.errors.length > 0;
                    return (
                      <tr key={r.rowNumber} style={{ borderBottom: "1px solid var(--nomi-border)", backgroundColor: hasErr ? "#FEF2F2" : "#fff" }}>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.rowNumber}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.document_number || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.document_type || "—"}</td>
                        <td className="px-3 py-2 text-xs font-semibold" style={{ color: "var(--nomi-navy)" }}>{`${r.first_name} ${r.last_name}`.trim() || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.phone || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.email || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-muted)" }}>{r.city || "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-navy)" }}>{Number.isFinite(r.salary) ? formatCOP(r.salary) : "—"}</td>
                        <td className="px-3 py-2 text-xs font-bold" style={{ color: "var(--nomi-teal)" }}>{Number.isFinite(r.credit_limit) ? formatCOP(r.credit_limit) : "—"}</td>
                        <td className="px-3 py-2 text-xs" style={{ color: "var(--nomi-navy)" }}>{Number.isFinite(r.max_installments) ? r.max_installments : "—"}</td>
                        <td className="px-3 py-2 text-xs">
                          {hasErr ? <span style={{ color: "#DC2626" }}>{r.errors.join(", ")}</span> : <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>Listo</span>}
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

      {/* FORM CREAR/EDITAR */}
      <div className="bg-white rounded-2xl p-6 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="flex items-center justify-between">
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
            {isEditing ? "Editar empleado" : "Crear empleado"}
          </h2>
          {isEditing && (
            <button onClick={resetForm} className="text-xs font-semibold cursor-pointer" style={{ color: "var(--nomi-muted)" }}>
              Cancelar edicion
            </button>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre</label>
            <input style={IS} value={name} onChange={(e) => setName(e.target.value)} placeholder="Nombre completo" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Documento</label>
            <div className="flex gap-2">
              <select style={{ ...IS, width: "auto", minWidth: "90px" }} value={docType} onChange={(e) => setDocType(e.target.value as any)}>
                {DOC_TYPES.map((t) => <option key={t} value={t}>{t}</option>)}
              </select>
              <input style={IS} value={docNumber} onChange={(e) => setDocNumber(e.target.value)} placeholder="Numero" />
            </div>
          </div>

          {!isEditing && (
            <>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Correo</label>
                <input style={IS} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="correo@empresa.com" />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Contrasena</label>
                <input style={IS} type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="Minimo 8 caracteres" />
              </div>
            </>
          )}

          {isEditing && (
            <div className="md:col-span-2 px-3 py-2 rounded-xl text-xs" style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" }}>
              Para cambiar correo o contrasena del empleado contacta al administrador.
            </div>
          )}

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Cupo mensual autorizado</label>
            <input style={IS} type="number" min={0} value={creditLimit} onChange={(e) => setCreditLimit(e.target.value)} placeholder="0" />
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Cuotas autorizadas</label>
            <select style={IS} value={maxInstallments} onChange={(e) => setMaxInstallments(e.target.value)}>
              <option value="">Seleccionar cuotas</option>
              {[1,2,3,4,5,6,7,8,9,10,11,12].map((n) => (
                <option key={n} value={n}>{n} {n === 1 ? "cuota" : "cuotas"}</option>
              ))}
            </select>
          </div>

        </div>

        <div className="pt-2">
          <button onClick={handleSave} disabled={saving}
            className="px-6 py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            {saving ? "Guardando..." : isEditing ? "Guardar cambios" : "Crear empleado"}
          </button>
        </div>
      </div>

      {/* LISTA */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="px-5 py-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3"
          style={{ borderBottom: "1px solid var(--nomi-border)" }}>
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
            Empleados registrados ({rows.length})
          </h2>
          <input placeholder="Buscar por nombre o documento..."
            className="px-4 py-2 rounded-xl text-sm outline-none"
            style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", minWidth: "220px" }} />
        </div>

        <div className="grid grid-cols-5 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Empleado</span>
          <span>Cupo</span>
          <span>Cuotas</span>
          <span className="text-center">Estado</span>
        </div>

        {rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No se encontraron empleados
          </div>
        ) : rows.map((e) => (
          <div key={e.id}
            className="grid grid-cols-5 px-5 py-3.5 items-center transition hover:bg-slate-50 cursor-pointer"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}
            onClick={() => startEdit(e)}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                style={{ backgroundColor: "var(--nomi-navy)" }}>
                {(e.name || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>{e.name || "Sin nombre"}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{e.document_type} {e.document_number}</div>
              </div>
            </div>
            <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
              {e.credit_limit ? formatCOP(e.credit_limit) : "—"}
            </div>
            <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>
              {e.max_installments ? `${e.max_installments} cuotas` : "—"}
            </div>
            <div className="text-center">
              <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                style={e.active
                  ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                  : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {e.active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}