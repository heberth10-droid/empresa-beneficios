"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Building2 } from "lucide-react";

export default function AdminCompaniesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [empCounts, setEmpCounts] = useState<Record<string, number>>({});
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setDbError(null);

      const { data: brands, error: bErr } = await supabase
        .from("brands")
        .select("id, name, nit, active, created_at, admin_id")
        .order("created_at", { ascending: false });

      if (bErr) {
        setDbError("Error brands: " + bErr.message);
        setLoading(false);
        return;
      }

      const { data: employees, error: eErr } = await supabase
        .from("employees")
        .select("company_id");

      if (eErr) console.warn("employees error:", eErr.message);

      const counts: Record<string, number> = {};
      for (const e of employees || []) {
        if (e.company_id) counts[e.company_id] = (counts[e.company_id] || 0) + 1;
      }

      setRows(brands || []);
      setEmpCounts(counts);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Empresas / Marcas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {rows.length} registro{rows.length !== 1 ? "s" : ""} en brands
        </p>
      </div>

      {dbError && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {dbError}
        </div>
      )}

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-5 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Nombre</span>
          <span>NIT</span>
          <span className="text-center">Empleados</span>
          <span className="text-center">Estado</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => (
              <div key={i} className="h-14 rounded-xl animate-pulse"
                style={{ backgroundColor: "var(--nomi-gray)" }} />
            ))}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-12 text-center">
            <Building2 className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>
              No hay registros en la tabla brands
            </p>
          </div>
        ) : rows.map((c) => (
          <div key={c.id}
            className="grid grid-cols-5 px-5 py-4 items-center transition hover:bg-slate-50"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--nomi-teal-bg)" }}>
                <Building2 className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                  {c.name || "Sin nombre"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  ID: {c.id?.slice(0, 8)}
                </div>
              </div>
            </div>
            <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>
              {c.nit || "—"}
            </div>
            <div className="text-center">
              <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }}>
                {empCounts[c.id] || 0}
              </span>
            </div>
            <div className="text-center">
              <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                style={c.active !== false
                  ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                  : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {c.active !== false ? "Activa" : "Inactiva"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
