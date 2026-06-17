"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CO");
}

type Installment = {
  id: string;
  order_id: string;
  installment_number: number;
  amount: number;
  status: string;
  due_date: string | null;
  paid_at: string | null;
  employee_name: string;
  employee_doc: string;
};

export default function CompanyInstallmentsPage() {
  const router = useRouter();
  const [rows, setRows] = useState<Installment[]>([]);
  const [loading, setLoading] = useState(true);
  const [marking, setMarking] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [ok, setOk] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState("PENDING");
  const [q, setQ] = useState("");
  const [companyId, setCompanyId] = useState<string | null>(null);

  async function load(cId: string) {
    setLoading(true);
    setError(null);

    const { data: orders } = await supabase
      .from("orders")
      .select("id, employee_id, document_type, document_number")
      .eq("company_id", cId);

    if (!orders || orders.length === 0) { setRows([]); setLoading(false); return; }

    const orderIds = orders.map((o) => o.id);
    const empIds = [...new Set(orders.map((o) => o.employee_id).filter(Boolean))];

    const { data: installments } = await supabase
      .from("order_installments")
      .select("id, order_id, installment_number, amount, status, due_date, paid_at")
      .in("order_id", orderIds)
      .order("due_date", { ascending: true });

    const { data: emps } = await supabase.from("employees").select("id, name").in("id", empIds);

    const empMap: Record<string, string> = {};
    for (const e of emps || []) empMap[e.id] = e.name || "Empleado";

    const orderMap: Record<string, any> = {};
    for (const o of orders) orderMap[o.id] = o;

    const merged: Installment[] = (installments || []).map((i) => {
      const ord = orderMap[i.order_id] || {};
      return {
        ...i,
        employee_name: empMap[ord.employee_id] || "-",
        employee_doc: `${ord.document_type || ""} ${ord.document_number || ""}`.trim(),
      };
    });

    setRows(merged);
    setLoading(false);
  }

  useEffect(() => {
    async function boot() {
      const { data: userRes } = await supabase.auth.getUser();
      if (!userRes.user) { router.push("/login"); return; }
      const { data: u } = await supabase.from("users").select("role, company_id").eq("auth_id", userRes.user.id).single();
      if (!u || u.role !== "COMPANY_ADMIN" || !u.company_id) { router.push("/login"); return; }
      setCompanyId(u.company_id);
      await load(u.company_id);
    }
    boot();
  }, []);

  async function markPaid(id: string) {
    setMarking(id);
    setError(null);
    setOk(null);

    const { error } = await supabase.rpc("mark_installment_paid", {
      p_installment_id: id,
      p_paid_by: "company_admin",
    });

    setMarking(null);

    if (error) { setError("Error: " + error.message); return; }

    setOk("Cuota marcada como pagada. Cupo liberado al empleado.");
    if (companyId) await load(companyId);
  }

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      const matchStatus = statusFilter === "ALL" || r.status === statusFilter;
      const qx = q.trim().toLowerCase();
      if (!matchStatus) return false;
      if (!qx) return true;
      return [r.employee_name, r.employee_doc].join(" ").toLowerCase().includes(qx);
    });
  }, [rows, statusFilter, q]);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Pendiente", color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    PAID:    { label: "Pagada",    color: "#16A34A",            bg: "#DCFCE7" },
    OVERDUE: { label: "Vencida",   color: "#DC2626",            bg: "#FEE2E2" },
  };

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none" };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Cuotas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Marca cuotas como pagadas para liberar el cupo de tus empleados</p>
      </div>

      {error && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{error}</div>}
      {ok && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>{ok}</div>}

      <div className="bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <input placeholder="Buscar empleado o documento..." value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1" style={{ ...IS, width: "100%" }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} style={IS}>
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendientes</option>
          <option value="PAID">Pagadas</option>
          <option value="OVERDUE">Vencidas</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="grid grid-cols-6 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Empleado</span>
          <span>Cuota</span>
          <span>Vence</span>
          <span>Estado</span>
          <span>Accion</span>
        </div>

        {filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>No hay cuotas con esos filtros</div>
        ) : filtered.map((r) => {
          const sc = statusCfg[r.status] || { label: r.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
          return (
            <div key={r.id} className="grid grid-cols-6 px-5 py-3.5 items-center"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div className="col-span-2">
                <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{r.employee_name}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{r.employee_doc}</div>
              </div>
              <div>
                <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(r.amount)}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>#{r.installment_number}</div>
              </div>
              <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>
                {fmtDate(r.due_date)}
                {r.paid_at && <div className="text-xs">Pagada: {fmtDate(r.paid_at)}</div>}
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
              <div>
                {r.status !== "PAID" ? (
                  <button onClick={() => markPaid(r.id)} disabled={marking === r.id}
                    className="px-3 py-1.5 rounded-xl text-xs font-black cursor-pointer disabled:opacity-50"
                    style={{ backgroundColor: "var(--nomi-teal)", color: "#fff" }}>
                    {marking === r.id ? "..." : "Marcar pagada"}
                  </button>
                ) : (
                  <span className="text-xs" style={{ color: "var(--nomi-muted)" }}>Pagada</span>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
