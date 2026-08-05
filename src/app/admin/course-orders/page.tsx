"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CO");
}

export default function AdminCourseOrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [q, setQ] = useState("");

  async function load() {
    setLoading(true);
    const { data, error } = await supabase
      .from("course_orders")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) { setErr("Error cargando: " + error.message); }
    else { setRows(data || []); }
    setLoading(false);
  }

  useEffect(() => { load(); }, []);

  async function markProcessed(id: string) {
    setProcessing(id); setErr(null); setOk(null);
    const { error } = await supabase.from("course_orders").update({
      status: "PROCESSED",
      processed_at: new Date().toISOString(),
      processed_by: "admin",
    }).eq("id", id);
    setProcessing(null);
    if (error) { setErr("Error: " + error.message); return; }
    setOk("Curso marcado como procesado en Hotmart.");
    load();
  }

  async function markCancelled(id: string) {
    if (!confirm("¿Cancelar este curso?")) return;
    setProcessing(id);
    await supabase.from("course_orders").update({ status: "CANCELLED" }).eq("id", id);
    setProcessing(null);
    load();
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const qx = q.trim().toLowerCase();
      if (!matchStatus) return false;
      if (!qx) return true;
      return [r.employee_name, r.employee_email, r.course_name, r.employee_document].join(" ").toLowerCase().includes(qx);
    });
  }, [rows, statusFilter, q]);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:   { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    PROCESSED: { label: "Procesado",  color: "#16A34A",            bg: "#DCFCE7" },
    CANCELLED: { label: "Cancelado",  color: "#DC2626",            bg: "#FEE2E2" },
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Cursos</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Cursos pendientes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Gestiona en Hotmart los cursos comprados por los empleados
        </p>
      </div>

      {err && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{err}</div>}
      {ok && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>{ok}</div>}

      <div className="bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <input placeholder="Buscar empleado, curso, correo..."
          value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }}>
          <option value="ALL">Todos</option>
          <option value="PENDING">Pendientes</option>
          <option value="PROCESSED">Procesados</option>
          <option value="CANCELLED">Cancelados</option>
        </select>
        <button onClick={load} className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          Actualizar
        </button>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="grid grid-cols-6 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Empleado</span>
          <span className="col-span-2">Curso</span>
          <span>Estado</span>
          <span>Accion</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">{[1,2,3].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}</div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>No hay cursos con esos filtros</div>
        ) : filtered.map((r) => {
          const sc = statusCfg[r.status] || { label: r.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
          return (
            <div key={r.id} className="grid grid-cols-6 px-5 py-4 items-center" style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div className="col-span-2">
                <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{r.employee_name || "-"}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{r.employee_email || "-"}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{r.employee_document || "-"}</div>
              </div>
              <div className="col-span-2">
                <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{r.course_name}</div>
                <div className="font-black text-sm mt-0.5" style={{ color: "var(--nomi-orange)" }}>{money(r.course_price)}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{fmtDate(r.created_at)}</div>
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                {r.processed_at && (
                  <div className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>
                    {fmtDate(r.processed_at)}
                  </div>
                )}
              </div>
              <div className="space-y-1">
                {r.status === "PENDING" && (
                  <>
                    <button onClick={() => markProcessed(r.id)} disabled={processing === r.id}
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: "var(--nomi-teal)", color: "#fff" }}>
                      {processing === r.id ? "..." : "Procesado en Hotmart"}
                    </button>
                    <button onClick={() => markCancelled(r.id)} disabled={processing === r.id}
                      className="w-full px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer disabled:opacity-50"
                      style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" }}>
                      Cancelar
                    </button>
                  </>
                )}
                {r.status !== "PENDING" && (
                  <span className="text-xs" style={{ color: "var(--nomi-muted)" }}>
                    {r.processed_by || "-"}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
