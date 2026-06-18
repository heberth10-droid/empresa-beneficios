"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import EmployeeSidebar from "@/components/EmployeeSidebar";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

export default function EmployeeInstallmentsPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [installments, setInstallments] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userRow } = await supabase.from("users").select("role, company_id").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE") { router.push("/login"); return; }

      const { data: emp } = await supabase.from("employees").select("id").eq("company_id", userRow.company_id).eq("email", user.email).single();
      if (!emp) { router.push("/login"); return; }

      const { data: ords } = await supabase.from("orders").select("id").eq("employee_id", emp.id);
      if (!ords || ords.length === 0) { setLoading(false); return; }

      const orderIds = ords.map((o: any) => o.id);
      const { data: inst } = await supabase.from("order_installments")
        .select("id, order_id, installment_number, amount, status, due_date, paid_at")
        .in("order_id", orderIds)
        .order("due_date", { ascending: true });

      setInstallments(inst || []);
      setLoading(false);
    }
    load();
  }, [router]);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Pendiente", color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    PAID:    { label: "Pagada",    color: "#16A34A",            bg: "#DCFCE7" },
    OVERDUE: { label: "Vencida",   color: "#DC2626",            bg: "#FEE2E2" },
  };

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="hidden md:flex"><EmployeeSidebar /></div>
      <main className="flex-1 p-6 md:p-8 space-y-6">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Mi portal</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mis cuotas</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Historial de todas tus cuotas</p>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <div className="grid grid-cols-5 px-5 py-3 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
            <span>Orden</span>
            <span>Cuota</span>
            <span>Valor</span>
            <span>Vence</span>
            <span>Estado</span>
          </div>
          {installments.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>No tienes cuotas registradas</div>
          ) : installments.map((i) => {
            const sc = statusCfg[i.status] || { label: i.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
            return (
              <div key={i.id} className="grid grid-cols-5 px-5 py-3.5 items-center"
                style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                <div className="text-xs font-semibold" style={{ color: "var(--nomi-navy)" }}>#{i.order_id.slice(0, 8)}</div>
                <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>#{i.installment_number}</div>
                <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(i.amount)}</div>
                <div className="text-sm" style={{ color: "var(--nomi-muted)" }}>
                  {i.due_date ? new Date(i.due_date).toLocaleDateString("es-CO") : "-"}
                  {i.paid_at && <div className="text-xs">Pagada: {new Date(i.paid_at).toLocaleDateString("es-CO")}</div>}
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full w-fit"
                  style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
