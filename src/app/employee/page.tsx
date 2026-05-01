"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

export default function EmployeeHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);

      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userRow, error: userErr } = await supabase
        .from("users")
        .select("role, company_id")
        .eq("auth_id", user.id)
        .single();

      if (userErr || !userRow || userRow.role !== "EMPLOYEE" || !userRow.company_id) {
        router.push("/login");
        return;
      }

      // Vinculamos empleado por email + company_id
      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("*")
        .eq("company_id", userRow.company_id)
        .eq("email", user.email)
        .single();

      if (empErr || !emp) {
        setErr(
          "No se encontró tu registro de empleado. Verifica que tu email coincida con el registrado por la empresa."
        );
        setLoading(false);
        return;
      }

      setEmployee(emp);

      // Cargar datos de la empresa para mostrar nombre/nit
      const { data: comp, error: compErr } = await supabase
        .from("companies")
        .select("id, name, nit")
        .eq("id", userRow.company_id)
        .single();

      if (!compErr && comp) setCompany(comp);

      setLoading(false);
    }

    load();
  }, [router]);

  if (loading) return <div className="text-slate-300">Cargando portal...</div>;
  if (err) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
        {err}
      </div>
    );
  }

  const creditLimit = Number(employee.credit_limit || 0);
  const creditUsed = Number(employee.credit_used || 0);
  const creditAvailable = Math.max(0, creditLimit - creditUsed);

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">Hola, {employee.name}</h1>
        <p className="text-slate-400 text-sm">
          Aquí puedes ver tu cupo, tus órdenes y tus cuotas.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Cupo total</div>
          <div className="text-emerald-300 text-xl font-bold">{money(creditLimit)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Cupo usado</div>
          <div className="text-slate-200 text-xl font-bold">{money(creditUsed)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Disponible</div>
          <div className="text-emerald-300 text-xl font-bold">{money(creditAvailable)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Cuotas máximas</div>
          <div className="text-slate-200 text-xl font-bold">{employee.max_installments}</div>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 space-y-2">
        <div className="text-sm text-slate-300">
          <b>Empresa:</b>{" "}
          {company ? (
            <>
              {company.name} • NIT {company.nit} <span className="text-slate-500">•</span>{" "}
              <span className="text-slate-400 text-xs">{company.id}</span>
            </>
          ) : (
            <span className="text-slate-400">(Cargando datos...)</span>
          )}
        </div>

        <div className="text-sm text-slate-400">
          <b>Documento:</b> {employee.document_type}-{employee.document_number}
        </div>

        <div className="text-sm text-slate-400">
          <b>Email:</b> {employee.email}
        </div>

        <div className="text-sm text-slate-400">
          <b>Celular:</b> {employee.phone || "—"}
        </div>
      </div>
    </div>
  );
}