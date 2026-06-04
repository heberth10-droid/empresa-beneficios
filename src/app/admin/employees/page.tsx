"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users, X } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminEmployeesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [companyMap, setCompanyMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    async function load() {
      const { data: employees } = await supabase
        .from("employees")
        .select("id, company_id, name, document_type, document_number, email, phone, active, credit_limit, credit_used, max_installments, salary, address, city, created_at")
        .order("created_at", { ascending: false });

      const companyIds = [...new Set((employees || []).map((e: any) => e.company_id).filter(Boolean))];
      let cmap: Record<string, string> = {};
      if (companyIds.length > 0) {
        const { data: companies } = await supabase
          .from("companies")
          .select("id, name")
          .in("id", companyIds);
        for (const c of companies || []) cmap[c.id] = c.name || c.id;
      }

      setRows(employees || []);
      setCompanyMap(cmap);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    let r = rows;
    if (filter === "ACTIVE") r = r.filter((x) => x.active);
    if (filter === "INACTIVE") r = r.filter((x) => !x.active);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((x) =>
        (x.name || "").toLowerCase().includes(q) ||
        (x.email || "").toLowerCase().includes(q) ||
        (x.document_number || "").includes(q)
      );
    }
    return r;
  }, [rows, filter, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Empleados</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {filtered.length} de {rows.length} empleados
        </p>
      </div>

      <div className="flex gap-3 flex-wrap">
        <input type="text" placeholder="Buscar por nombre, email o documento..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }} />
        <select value={filter} onChange={(e) => setFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none font-semibold cursor-pointer"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}>
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-5 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Empleado</span>
          <span>Empresa</span>
          <span className="text-right">Cupo</span>
          <span className="text-center">Estado</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => (
              <div key={i} className="h-14 rounded-xl animate-pulse"
                style={{ backgroundColor: "var(--nomi-gray)" }} />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Users className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>
              No se encontraron empleados
            </p>
          </div>
        ) : filtered.map((e) => (
          <div key={e.id}
            className="grid grid-cols-5 px-5 py-3.5 items-center transition hover:bg-slate-50 cursor-pointer"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}
            onClick={() => setSelected(e)}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                style={{ backgroundColor: "var(--nomi-navy)" }}>
                {(e.name || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                  {e.name || "Sin nombre"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  {e.document_type} {e.document_number}
                </div>
              </div>
            </div>
            <div className="text-sm truncate pr-2" style={{ color: "var(--nomi-muted)" }}>
              {companyMap[e.company_id] || "—"}
            </div>
            <div className="text-right font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
              {e.credit_limit ? money(e.credit_limit) : "—"}
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

      {/* MODAL DETALLE */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl"
            style={{ border: "1.5px solid var(--nomi-border)" }}
            onClick={(e) => e.stopPropagation()}>

            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-base font-black text-white"
                  style={{ backgroundColor: "var(--nomi-navy)" }}>
                  {(selected.name || "E").charAt(0).toUpperCase()}
                </div>
                <div>
                  <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                    {selected.name || "Sin nombre"}
                  </div>
                  <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>
                    {selected.document_type} {selected.document_number}
                  </div>
                </div>
              </div>
              <button onClick={() => setSelected(null)}
                className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                style={{ backgroundColor: "var(--nomi-gray)" }}>
                <X className="w-4 h-4" style={{ color: "var(--nomi-muted)" }} />
              </button>
            </div>

            {/* BODY */}
            <div className="px-6 py-5 space-y-3">
              {[
                ["Empresa", companyMap[selected.company_id] || "—"],
                ["Email", selected.email || "—"],
                ["Celular", selected.phone || "—"],
                ["Direccion", selected.address || "—"],
                ["Ciudad", selected.city || "—"],
                ["Salario", selected.salary ? money(selected.salary) : "—"],
                ["Cupo total", selected.credit_limit ? money(selected.credit_limit) : "—"],
                ["Cupo usado", selected.credit_used ? money(selected.credit_used) : "—"],
                ["Cupo disponible", money(Math.max(0, Number(selected.credit_limit || 0) - Number(selected.credit_used || 0)))],
                ["Cuotas maximas", selected.max_installments ?? "—"],
              ].map(([label, value]) => (
                <div key={label} className="flex justify-between items-start gap-3">
                  <span className="text-xs font-semibold shrink-0" style={{ color: "var(--nomi-muted)" }}>
                    {label}
                  </span>
                  <span className="text-xs font-bold text-right" style={{ color: "var(--nomi-navy)" }}>
                    {value}
                  </span>
                </div>
              ))}
            </div>

            <div className="px-6 pb-5">
              <span className="text-xs font-bold px-3 py-1.5 rounded-full"
                style={selected.active
                  ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                  : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {selected.active ? "Activo" : "Inactivo"}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
