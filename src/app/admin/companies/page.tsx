"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCompaniesPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      setRows(data || []);
    }

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Empresas</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {rows.map((c) => (
          <div key={c.id} className="p-4 border-b border-slate-800">
            <div className="font-bold">{c.name || c.legal_name || "Empresa"}</div>
            <div className="text-sm text-slate-400">{c.nit || c.tax_id || "Sin NIT"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
