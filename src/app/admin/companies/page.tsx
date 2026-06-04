"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Building2 } from "lucide-react";

export default function AdminCompaniesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("companies")
        .select("*, employees(id)")
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Empresas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {rows.length} empresa{rows.length !== 1 ? "s" : ""} vinculada{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-4 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Empresa</span>
          <span>Sector</span>
          <span className="text-right">Empleados</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : rows.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No hay empresas registradas
          </div>
        ) : rows.map((c) => (
          <div key={c.id}
            className="grid grid-cols-4 px-5 py-4 items-center transition hover:bg-slate-50"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ backgroundColor: "var(--nomi-teal-bg)" }}>
                <Building2 className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} />
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                  {c.name || c.legal_name || "Empresa"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  NIT: {c.nit || c.tax_id || "Sin NIT"}
                </div>
              </div>
            </div>
            <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>
              {c.sector || "—"}
            </div>
            <div className="text-right">
              <span className="text-sm font-bold px-2.5 py-1 rounded-full"
                style={{ backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }}>
                {c.employees?.length || 0}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
