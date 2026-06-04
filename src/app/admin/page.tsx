"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { Building2, Tag, Users, Package, ShoppingCart, TrendingUp } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora mismo";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

const statusLabel: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
  CONFIRMED:  { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
  PROCESSING: { label: "En proceso", color: "#8B5CF6",            bg: "#EDE9FE" },
  SHIPPED:    { label: "Enviada",    color: "#2563EB",            bg: "#DBEAFE" },
  DELIVERED:  { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
  CANCELLED:  { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
};

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    companies: 0, brands: 0, employees: 0,
    products: 0, orders: 0, gmv: 0,
    pendingOrders: 0, avgTicket: 0,
  });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [companies, brands, employees, products, orders, recent] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, subtotal, status"),
        supabase.from("orders")
          .select("id, subtotal, status, created_at, employee_id, employees(name)")
          .order("created_at", { ascending: false })
          .limit(8),
      ]);

      const allOrders = orders.data || [];
      const gmv = allOrders.reduce((a: number, o: any) => a + Number(o.subtotal || 0), 0);
      const pendingOrders = allOrders.filter((o: any) => o.status === "PENDING").length;

      setStats({
        companies: companies.count || 0,
        brands: brands.count || 0,
        employees: employees.count || 0,
        products: products.count || 0,
        orders: allOrders.length,
        gmv,
        pendingOrders,
        avgTicket: allOrders.length ? gmv / allOrders.length : 0,
      });

      setRecentOrders(recent.data || []);
      setLoading(false);
    }
    load();
  }, []);

  const cards = [
    { label: "Empresas vinculadas",  value: stats.companies,               icon: Building2,    accent: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    { label: "Marcas aliadas",       value: stats.brands,                  icon: Tag,          accent: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    { label: "Empleados activos",    value: stats.employees,               icon: Users,        accent: "var(--nomi-navy)",   bg: "var(--nomi-gray)" },
    { label: "Productos activos",    value: stats.products,                icon: Package,      accent: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    { label: "Total ordenes",        value: stats.orders,                  icon: ShoppingCart, accent: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    { label: "Ordenes pendientes",   value: stats.pendingOrders,           icon: ShoppingCart, accent: "#DC2626",            bg: "#FEE2E2" },
    { label: "GMV total",            value: money(stats.gmv),              icon: TrendingUp,   accent: "var(--nomi-navy)",   bg: "var(--nomi-gray)" },
    { label: "Ticket promedio",      value: money(stats.avgTicket),        icon: TrendingUp,   accent: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
  ];

  return (
    <div className="space-y-8">

      {/* HEADER */}
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>
          Panel de control
        </p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>
          Dashboard
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Vista general de toda la operacion NOMI
        </p>
      </div>

      {/* STAT CARDS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <div key={c.label} className="rounded-2xl p-5 bg-white transition hover:shadow-md"
              style={{ border: "1.5px solid var(--nomi-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>
                  {c.label}
                </span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: c.bg }}>
                  <Icon className="w-4 h-4" style={{ color: c.accent }} />
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: "var(--nomi-navy)" }}>
                {loading ? <span className="inline-block w-16 h-7 rounded-lg animate-pulse" style={{ backgroundColor: "var(--nomi-border)" }} /> : c.value}
              </div>
            </div>
          );
        })}
      </div>

      {/* ULTIMAS ORDENES */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-black" style={{ color: "var(--nomi-navy)" }}>
            Ultimas ordenes
          </h2>
          <a href="/admin/orders" className="text-xs font-bold"
            style={{ color: "var(--nomi-teal)" }}>
            Ver todas →
          </a>
        </div>

        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid var(--nomi-border)" }}>

          {/* TABLE HEADER */}
          <div className="grid grid-cols-4 px-5 py-3 text-xs font-bold uppercase tracking-wide"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
            <span>Orden</span>
            <span>Empleado</span>
            <span>Estado</span>
            <span className="text-right">Valor</span>
          </div>

          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3,4].map(i => (
                <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />
              ))}
            </div>
          ) : recentOrders.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
              No hay ordenes aun
            </div>
          ) : (
            recentOrders.map((o) => {
              const st = statusLabel[o.status] || { label: o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
              return (
                <div key={o.id}
                  className="grid grid-cols-4 px-5 py-3.5 items-center text-sm transition hover:bg-slate-50"
                  style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                  <div>
                    <div className="font-bold text-xs" style={{ color: "var(--nomi-navy)" }}>
                      #{o.id.slice(0, 8)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                      {timeAgo(o.created_at)}
                    </div>
                  </div>
                  <div className="text-sm font-semibold truncate pr-2" style={{ color: "var(--nomi-navy)" }}>
                    {o.employees?.name || "—"}
                  </div>
                  <div>
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  </div>
                  <div className="text-right font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                    {money(o.subtotal)}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
