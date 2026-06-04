"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
  CONFIRMED:  { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
  PROCESSING: { label: "En proceso", color: "#8B5CF6",            bg: "#EDE9FE" },
  SHIPPED:    { label: "Enviada",    color: "#2563EB",            bg: "#DBEAFE" },
  DELIVERED:  { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
  CANCELLED:  { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
};

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*, employees(name, companies(name))")
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() =>
    filter === "ALL" ? rows : rows.filter((r) => r.status === filter),
    [rows, filter]
  );

  const statuses = ["ALL", "PENDING", "CONFIRMED", "PROCESSING", "SHIPPED", "DELIVERED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Ordenes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {filtered.length} orden{filtered.length !== 1 ? "es" : ""}
        </p>
      </div>

      {/* FILTER PILLS */}
      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => {
          const cfg = statusConfig[s];
          const active = filter === s;
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition"
              style={active
                ? { backgroundColor: "var(--nomi-navy)", color: "#fff" }
                : { backgroundColor: "#fff", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
              {s === "ALL" ? "Todas" : cfg?.label || s}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-5 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span>Orden</span>
          <span>Empleado</span>
          <span>Empresa</span>
          <span>Estado</span>
          <span className="text-right">Total</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No hay ordenes con este filtro
          </div>
        ) : filtered.map((o) => {
          const st = statusConfig[o.status] || { label: o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
          return (
            <div key={o.id}
              className="grid grid-cols-5 px-5 py-3.5 items-center text-sm transition hover:bg-slate-50"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div>
                <div className="font-bold text-xs" style={{ color: "var(--nomi-navy)" }}>
                  #{o.id.slice(0, 8)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  {new Date(o.created_at).toLocaleDateString("es-CO")}
                </div>
              </div>
              <div className="font-semibold truncate pr-2" style={{ color: "var(--nomi-navy)" }}>
                {o.employees?.name || "—"}
              </div>
              <div className="truncate pr-2" style={{ color: "var(--nomi-muted)" }}>
                {o.employees?.companies?.name || "—"}
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              <div className="text-right font-black" style={{ color: "var(--nomi-navy)" }}>
                {money(o.subtotal)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
