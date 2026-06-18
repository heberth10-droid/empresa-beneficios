"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EmployeeSidebar from "@/components/EmployeeSidebar";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}
function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CO");
}

export default function EmployeeOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userRow } = await supabase.from("users").select("role, company_id, employee_id").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE") { router.push("/login"); return; }

      let emp: any = null;
      if (userRow.employee_id) {
        const { data } = await supabase.from("employees").select("id").eq("id", userRow.employee_id).single();
        emp = data;
      }
      if (!emp && user.email) {
        const { data } = await supabase.from("employees").select("id").eq("company_id", userRow.company_id).eq("email", user.email).single();
        emp = data;
      }
      if (!emp) { setErr("No se encontro tu registro de empleado."); setLoading(false); return; }

      const { data: ords, error: ordErr } = await supabase
        .from("orders")
        .select("id, created_at, status, subtotal, installments, installment_amount")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false });

      if (ordErr) { setErr("No se pudieron cargar tus ordenes."); setLoading(false); return; }
      setOrders(ords || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return orders;
    return orders.filter((o) => [o.id, o.status].join(" ").toLowerCase().includes(x));
  }, [orders, q]);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:   { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    CONFIRMED: { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    PROCESSED: { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
    DELIVERED: { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
    CANCELLED: { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  const Content = () => (
    <div className="space-y-5">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Mi portal</p>
        <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mis ordenes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>{orders.length} ordenes en total</p>
      </div>

      {err && <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{err}</div>}

      <input placeholder="Buscar por estado o ID..."
        value={q} onChange={(e) => setQ(e.target.value)}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }} />

      {filtered.length === 0 ? (
        <div className="bg-white rounded-2xl p-6 text-sm" style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-muted)" }}>
          No tienes ordenes aun.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const sc = statusCfg[o.status] || { label: o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
            return (
              <Link key={o.id} href={`/employee/orders/${o.id}`}
                className="block bg-white rounded-2xl p-4 cursor-pointer"
                style={{ border: "1.5px solid var(--nomi-border)" }}>
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>#{o.id.slice(0, 8)}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{fmtDate(o.created_at)}</div>
                  </div>
                  <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                    style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                </div>
                <div className="grid grid-cols-3 gap-3 mt-3">
                  <div>
                    <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>Total</div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(o.subtotal)}</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>Cuotas</div>
                    <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{o.installments}</div>
                  </div>
                  <div>
                    <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>Valor/cuota</div>
                    <div className="font-semibold text-sm" style={{ color: "var(--nomi-orange)" }}>{money(o.installment_amount)}</div>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );

  return (
    <div className="min-h-screen" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="md:hidden"><EmployeeSidebar /></div>
      <div className="hidden md:flex min-h-screen">
        <EmployeeSidebar />
        <main className="flex-1 p-8 overflow-y-auto"><Content /></main>
      </div>
      <div className="md:hidden p-4"><Content /></div>
    </div>
  );
}
