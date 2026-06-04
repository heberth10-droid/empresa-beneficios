"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Users } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminEmployeesPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("employees")
        .select("*, companies(name)")
        .order("created_at", { ascending: false });
      setRows(data || []);
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
        (x.document_number || "").toLowerCase().includes(q)
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

      {/* FILTROS */}
      <div className="flex gap-3 flex-wrap">
        <input
          type="text" placeholder="Buscar por nombre, email o documento..."
          value={search} onChange={(e) => setSearch(e.target.value)}
          className="flex-1 min-w-[220px] px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}
        />
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

        <div className="grid grid-cols-4 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Empleado</span>
          <span>Empresa</span>
          <span className="text-right">Cupo</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No se encontraron empleados
          </div>
        ) : filtered.map((e) => (
          <div key={e.id}
            className="grid grid-cols-4 px-5 py-3.5 items-center transition hover:bg-slate-50"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <div className="col-span-2 flex items-center gap-3">
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                style={{ backgroundColor: "var(--nomi-navy)" }}>
                {(e.name || "E").charAt(0).toUpperCase()}
              </div>
              <div>
                <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                  {e.name || "Empleado"}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  {e.email || `${e.document_type || ""} ${e.document_number || ""}`.trim() || "Sin datos"}
                </div>
              </div>
            </div>
            <div className="text-sm truncate pr-2" style={{ color: "var(--nomi-muted)" }}>
              {e.companies?.name || "—"}
            </div>
            <div className="text-right">
              <span className="text-sm font-black" style={{ color: "var(--nomi-navy)" }}>
                {e.credit_limit ? money(e.credit_limit) : "—"}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
