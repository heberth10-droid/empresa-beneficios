"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function EmployeesPage() {
  const router = useRouter();

  const [employees, setEmployees] = useState<any[]>([]);
  const [companies, setCompanies] = useState<any[]>([]);

  const [newEmployeeName, setNewEmployeeName] = useState("");
  const [newEmployeeDocument, setNewEmployeeDocument] = useState("");
  const [newEmployeeEmail, setNewEmployeeEmail] = useState("");
  const [newEmployeePosition, setNewEmployeePosition] = useState("");
  const [newEmployeeDepartment, setNewEmployeeDepartment] = useState("");
  const [newEmployeeCompanyId, setNewEmployeeCompanyId] = useState("");
  const [newEmployeeCreditLimit, setNewEmployeeCreditLimit] = useState("");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verificar SUPER_ADMIN
  useEffect(() => {
    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!profile || profile.role !== "SUPER_ADMIN") {
        router.push("/login");
        return;
      }
    }

    checkRole();
  }, [router]);

  // Cargar empresas + empleados
  useEffect(() => {
    async function loadData() {
      setLoading(true);

      const [{ data: companiesData }, { data: employeesData }] = await Promise.all([
        supabase.from("companies").select("*").order("name", { ascending: true }),
        supabase.from("employees").select("*").order("created_at", { ascending: false }),
      ]);

      setCompanies(companiesData || []);
      setEmployees(employeesData || []);
      setLoading(false);
    }

    loadData();
  }, []);

  // Crear empleado
  async function createEmployee(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!newEmployeeName.trim() || !newEmployeeDocument.trim()) {
      setErrorMsg("Nombre y documento son obligatorios.");
      return;
    }

    if (!newEmployeeCompanyId) {
      setErrorMsg("Debes seleccionar una empresa.");
      return;
    }

    const { data, error } = await supabase
      .from("employees")
      .insert({
        full_name: newEmployeeName.trim(),
        document: newEmployeeDocument.trim(),
        email: newEmployeeEmail.trim() || null,
        position: newEmployeePosition.trim() || null,
        department: newEmployeeDepartment.trim() || null,
        company_id: newEmployeeCompanyId,
        status: "ACTIVE",
        credit_limit: newEmployeeCreditLimit ? Number(newEmployeeCreditLimit) : null,
      })
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEmployees((prev) => [data, ...prev]);

    // limpiar formulario
    setNewEmployeeName("");
    setNewEmployeeDocument("");
    setNewEmployeeEmail("");
    setNewEmployeePosition("");
    setNewEmployeeDepartment("");
    setNewEmployeeCompanyId("");
    setNewEmployeeCreditLimit("");
  }

  // Activar / desactivar empleado
  async function toggleEmployeeStatus(id: string, currentStatus: string) {
    const newStatus = currentStatus === "ACTIVE" ? "INACTIVE" : "ACTIVE";

    const { data, error } = await supabase
      .from("employees")
      .update({ status: newStatus })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setEmployees((prev) =>
      prev.map((emp) => (emp.id === id ? data : emp))
    );
  }

  if (loading) return <p>Cargando empleados...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empleados</h1>

      {errorMsg && (
        <p className="text-red-400 text-sm mb-4">{errorMsg}</p>
      )}

      {/* FORMULARIO */}
      <form onSubmit={createEmployee} className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-10 max-w-4xl">
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded"
          placeholder="Nombre completo"
          value={newEmployeeName}
          onChange={(e) => setNewEmployeeName(e.target.value)}
        />
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded"
          placeholder="Documento"
          value={newEmployeeDocument}
          onChange={(e) => setNewEmployeeDocument(e.target.value)}
        />
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded"
          placeholder="Email (opcional)"
          value={newEmployeeEmail}
          onChange={(e) => setNewEmployeeEmail(e.target.value)}
        />
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded"
          placeholder="Cargo (opcional)"
          value={newEmployeePosition}
          onChange={(e) => setNewEmployeePosition(e.target.value)}
        />
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded"
          placeholder="Área (opcional)"
          value={newEmployeeDepartment}
          onChange={(e) => setNewEmployeeDepartment(e.target.value)}
        />

        <select
          className="bg-slate-900 border border-slate-700 p-2 rounded text-sm"
          value={newEmployeeCompanyId}
          onChange={(e) => setNewEmployeeCompanyId(e.target.value)}
        >
          <option value="">Selecciona empresa</option>
          {companies.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded"
          type="number"
          placeholder="Cupo crédito (opcional)"
          value={newEmployeeCreditLimit}
          onChange={(e) => setNewEmployeeCreditLimit(e.target.value)}
        />

        <button className="bg-emerald-500 px-4 py-2 rounded text-slate-900 font-semibold">
          Crear empleado
        </button>
      </form>

      {/* LISTADO */}
      <ul className="space-y-3 text-sm">
        {employees.map((emp) => {
          const company = companies.find((c) => c.id === emp.company_id);

          return (
            <li
              key={emp.id}
              className="border-b border-slate-800 pb-3 flex justify-between"
            >
              <div>
                <div className="font-semibold">
                  {emp.full_name}  
                  <span className="text-slate-400 text-xs"> ({emp.document})</span>
                </div>

                <div className="text-slate-400 text-xs">
                  Empresa: {company ? company.name : "Sin empresa"}
                </div>

                <div className="text-slate-400 text-xs">
                  Estado:{" "}
                  <span className={emp.status === "ACTIVE" ? "text-emerald-400" : "text-yellow-400"}>
                    {emp.status}
                  </span>
                </div>

                <div className="text-slate-400 text-xs">
                  Cupo: {emp.credit_limit ? `$${emp.credit_limit}` : "No asignado"}
                </div>
              </div>

              <button
                onClick={() => toggleEmployeeStatus(emp.id, emp.status)}
                className="text-blue-300 hover:text-blue-100 text-xs"
              >
                {emp.status === "ACTIVE" ? "Desactivar" : "Activar"}
              </button>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
