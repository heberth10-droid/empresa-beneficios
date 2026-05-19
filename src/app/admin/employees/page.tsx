"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminEmployeesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("employees")
        .select("*")
        .order("created_at", { ascending: false });

      setRows(data || []);
    }

    load();
  }, []);

  const filtered = useMemo(() => {
    if (filter === "ALL") return rows;
    if (filter === "ACTIVE") return rows.filter((r) => r.active);
    return rows.filter((r) => !r.active);
  }, [rows, filter]);

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-black">Empleados</h1>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-3 py-2"
        >
          <option value="ALL">Todos</option>
          <option value="ACTIVE">Activos</option>
          <option value="INACTIVE">Inactivos</option>
        </select>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {filtered.map((e) => (
          <div key={e.id} className="p-4 border-b border-slate-800">
            <div className="font-bold">{e.name || "Empleado"}</div>
            <div className="text-sm text-slate-400">
              {e.document_type} {e.document_number} · {e.email || "Sin email"}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
