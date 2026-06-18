"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import EmployeeSidebar from "@/components/EmployeeSidebar";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

export default function EmployeeHome() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [employee, setEmployee] = useState<any>(null);
  const [company, setCompany] = useState<any>(null);
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [pendingInstallments, setPendingInstallments] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userRow } = await supabase.from("users").select("role, company_id, employee_id").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE" || !userRow.company_id) { router.push("/login"); return; }

      let emp: any = null;

      // Caso 1: tiene employee_id directo en users
      if (userRow.employee_id) {
        const { data } = await supabase.from("employees").select("*").eq("id", userRow.employee_id).single();
        emp = data;
      }

      // Caso 2: buscar por email + company_id (empleados creados antes)
      if (!emp && user.email) {
        const { data } = await supabase.from("employees").select("*").eq("company_id", userRow.company_id).eq("email", user.email).single();
        emp = data;
      }

      if (!emp) {
        setErr("No se encontro tu registro de empleado. Contacta al administrador de tu empresa.");
        setLoading(false);
        return;
      }

      // Si encontramos al empleado pero no tenia employee_id, lo actualizamos
      if (!userRow.employee_id && emp) {
        await supabase.from("users").update({ employee_id: emp.id }).eq("auth_id", user.id);
      }

      setEmployee(emp);

      const { data: comp } = await supabase.from("companies").select("id, name, nit").eq("id", userRow.company_id).single();
      if (comp) setCompany(comp);

      const { data: ords } = await supabase.from("orders").select("id, created_at, status, subtotal, installments, installment_amount").eq("employee_id", emp.id).order("created_at", { ascending: false }).limit(3);
      setRecentOrders(ords || []);

      const { data: ordsFull } = await supabase.from("orders").select("id").eq("employee_id", emp.id);
      if (ordsFull && ordsFull.length > 0) {
        const orderIds = ordsFull.map((o: any) => o.id);
        const { data: inst } = await supabase.from("order_installments").select("id, order_id, installment_number, amount, due_date, status").in("order_id", orderIds).eq("status", "PENDING").order("due_date", { ascending: true }).limit(5);
        setPendingInstallments(inst || []);
      }

      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return (
    <div className="flex min-h-screen items-center justify-center" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (err) return (
    <div className="flex min-h-screen items-center justify-center p-4" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{err}</div>
    </div>
  );

  const creditLimit = Number(employee.credit_limit || 0);
  const creditUsed = Number(employee.credit_used || 0);
  const creditAvailable = Math.max(0, creditLimit - creditUsed);
  const creditPct = creditLimit > 0 ? Math.min(100, Math.round((creditUsed / creditLimit) * 100)) : 0;

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:   { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    CONFIRMED: { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    PROCESSED: { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
    DELIVERED: { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
    CANCELLED: { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
  };

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--nomi-gray)" }}>
      <div className="hidden md:flex">
        <EmployeeSidebar />
      </div>

      <main className="flex-1 p-6 md:p-8 space-y-6 overflow-y-auto">

        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Bienvenido</p>
            <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Hola, {employee.name?.split(" ")[0]}</h1>
            <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>{company?.name}{company?.nit ? ` · NIT ${company.nit}` : ""}</p>
          </div>
          <Link href="/market"
            className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
            Ir al marketplace
          </Link>
        </div>

        <div className="bg-white rounded-2xl p-6" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--nomi-teal)" }}>Mi cupo mensual</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-5">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Cupo total</p>
              <p className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>{money(creditLimit)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Usado</p>
              <p className="text-xl font-black" style={{ color: "var(--nomi-orange)" }}>{money(creditUsed)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Disponible</p>
              <p className="text-xl font-black" style={{ color: "#16A34A" }}>{money(creditAvailable)}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Cuotas max</p>
              <p className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>{employee.max_installments}</p>
            </div>
          </div>
          <div className="w-full rounded-full h-3" style={{ backgroundColor: "var(--nomi-gray)" }}>
            <div className="h-3 rounded-full transition-all"
              style={{ width: `${creditPct}%`, backgroundColor: creditPct > 80 ? "#DC2626" : "var(--nomi-orange)" }} />
          </div>
          <p className="text-xs mt-2" style={{ color: "var(--nomi-muted)" }}>{creditPct}% del cupo utilizado</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

          <div className="bg-white rounded-2xl p-5" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Ultimas ordenes</p>
              <Link href="/employee/orders" className="text-xs font-semibold" style={{ color: "var(--nomi-orange)" }}>Ver todas</Link>
            </div>
            {recentOrders.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>No tienes ordenes aun.</p>
            ) : recentOrders.map((o) => {
              const sc = statusCfg[o.status] || { label: o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
              return (
                <Link key={o.id} href={`/employee/orders/${o.id}`}
                  className="flex items-center justify-between py-3 cursor-pointer"
                  style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                  <div>
                    <p className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>#{o.id.slice(0, 8)}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{o.installments} cuotas de {money(o.installment_amount)}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(o.subtotal)}</p>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
                  </div>
                </Link>
              );
            })}
          </div>

          <div className="bg-white rounded-2xl p-5" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: "var(--nomi-teal)" }}>Proximas cuotas</p>
              <Link href="/employee/installments" className="text-xs font-semibold" style={{ color: "var(--nomi-orange)" }}>Ver todas</Link>
            </div>
            {pendingInstallments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>No tienes cuotas pendientes.</p>
            ) : pendingInstallments.map((i) => (
              <div key={i.id} className="flex items-center justify-between py-3"
                style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                <div>
                  <p className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>Cuota #{i.installment_number}</p>
                  <p className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>Vence: {i.due_date ? new Date(i.due_date).toLocaleDateString("es-CO") : "-"}</p>
                </div>
                <p className="font-black text-sm" style={{ color: "var(--nomi-orange)" }}>{money(i.amount)}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-white rounded-2xl p-5" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs font-bold uppercase tracking-widest mb-4" style={{ color: "var(--nomi-teal)" }}>Mis datos</p>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Documento</p>
              <p className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{employee.document_type} {employee.document_number}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Email</p>
              <p className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{employee.email}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Celular</p>
              <p className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{employee.phone || "—"}</p>
            </div>
            <div>
              <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Ciudad</p>
              <p className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{employee.city || "—"}</p>
            </div>
          </div>
        </div>

      </main>
    </div>
  );
}
