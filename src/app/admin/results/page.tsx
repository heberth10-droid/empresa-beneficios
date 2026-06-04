"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { TrendingUp, ShoppingCart, Users, Building2 } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminResultsPage() {
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    gmv: 0, orders: 0, avgTicket: 0, totalCreditLimit: 0,
    employees: 0, companies: 0, delivered: 0, pending: 0,
  });
  const [topBrands, setTopBrands] = useState<{ name: string; revenue: number }[]>([]);
  const [topCompanies, setTopCompanies] = useState<{ name: string; gmv: number }[]>([]);

  useEffect(() => {
    async function load() {
      const [
        { data: orders },
        { data: employees },
        { data: companies },
        { data: items },
        { data: brands },
        { data: orderItems },
      ] = await Promise.all([
        supabase.from("orders").select("id, subtotal, status, company_id"),
        supabase.from("employees").select("id, credit_limit"),
        supabase.from("companies").select("id, name"),
        supabase.from("order_items").select("qty, unit_price, product_brand_id"),
        supabase.from("product_brands").select("id, name"),
        supabase.from("order_items").select("qty, unit_price, product_brand_id"),
      ]);

      const allOrders = orders || [];
      const gmv = allOrders.reduce((a, o: any) => a + Number(o.subtotal || 0), 0);
      const totalCreditLimit = (employees || []).reduce((a, e: any) => a + Number(e.credit_limit || 0), 0);

      // Top marcas
      const brandNameMap: Record<string, string> = {};
      for (const b of brands || []) brandNameMap[b.id] = b.name || b.id;

      const brandRevMap = new Map<string, number>();
      for (const it of orderItems || []) {
        const bId = (it as any).product_brand_id;
        if (!bId) continue;
        const name = brandNameMap[bId] || bId;
        const rev = Number((it as any).unit_price || 0) * Number((it as any).qty || 0);
        brandRevMap.set(name, (brandRevMap.get(name) || 0) + rev);
      }
      const topBrandsArr = Array.from(brandRevMap.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, revenue]) => ({ name, revenue }));

      // Top empresas
      const companyNameMap: Record<string, string> = {};
      for (const c of companies || []) companyNameMap[c.id] = c.name || c.id;

      const compGmvMap = new Map<string, number>();
      for (const o of allOrders) {
        const cId = (o as any).company_id;
        if (!cId) continue;
        const name = companyNameMap[cId] || cId;
        compGmvMap.set(name, (compGmvMap.get(name) || 0) + Number((o as any).subtotal || 0));
      }
      const topCompaniesArr = Array.from(compGmvMap.entries())
        .sort((a, b) => b[1] - a[1]).slice(0, 5)
        .map(([name, gmv]) => ({ name, gmv }));

      setStats({
        gmv,
        orders: allOrders.length,
        avgTicket: allOrders.length ? gmv / allOrders.length : 0,
        totalCreditLimit,
        employees: employees?.length || 0,
        companies: companies?.length || 0,
        delivered: allOrders.filter((o: any) => o.status === "DELIVERED").length,
        pending: allOrders.filter((o: any) => o.status === "PENDING").length,
      });
      setTopBrands(topBrandsArr);
      setTopCompanies(topCompaniesArr);
      setLoading(false);
    }
    load();
  }, []);

  const kpis = [
    { label: "GMV total",         value: money(stats.gmv),             icon: TrendingUp,   accent: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    { label: "Total ordenes",     value: stats.orders,                  icon: ShoppingCart, accent: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    { label: "Ticket promedio",   value: money(stats.avgTicket),        icon: TrendingUp,   accent: "var(--nomi-navy)",   bg: "var(--nomi-gray)" },
    { label: "Entregadas",        value: stats.delivered,               icon: ShoppingCart, accent: "#16A34A",            bg: "#DCFCE7" },
    { label: "Pendientes",        value: stats.pending,                 icon: ShoppingCart, accent: "#DC2626",            bg: "#FEE2E2" },
    { label: "Cupos totales/mes", value: money(stats.totalCreditLimit), icon: Users,        accent: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    { label: "Empleados",         value: stats.employees,               icon: Users,        accent: "var(--nomi-navy)",   bg: "var(--nomi-gray)" },
    { label: "Empresas",          value: stats.companies,               icon: Building2,    accent: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Analisis</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Resultados</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Metricas globales de la operacion NOMI
        </p>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((k) => {
          const Icon = k.icon;
          return (
            <div key={k.label} className="bg-white rounded-2xl p-5"
              style={{ border: "1.5px solid var(--nomi-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>{k.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: k.bg }}>
                  <Icon className="w-4 h-4" style={{ color: k.accent }} />
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: "var(--nomi-navy)" }}>
                {loading
                  ? <span className="inline-block w-20 h-7 rounded-lg animate-pulse" style={{ backgroundColor: "var(--nomi-border)" }} />
                  : k.value}
              </div>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* TOP MARCAS */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
              Top marcas por revenue
            </h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
            </div>
          ) : topBrands.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
              Sin datos de ordenes aun
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {topBrands.map((b, i) => {
                const pct = topBrands[0].revenue > 0 ? (b.revenue / topBrands[0].revenue) * 100 : 0;
                return (
                  <div key={b.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold" style={{ color: "var(--nomi-navy)" }}>
                        {i + 1}. {b.name}
                      </span>
                      <span className="font-black" style={{ color: "var(--nomi-teal)" }}>
                        {money(b.revenue)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: "var(--nomi-border)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: "var(--nomi-teal)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* TOP EMPRESAS */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
              Top empresas por GMV
            </h2>
          </div>
          {loading ? (
            <div className="p-5 space-y-3">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
            </div>
          ) : topCompanies.length === 0 ? (
            <div className="px-5 py-8 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
              Sin datos de ordenes aun
            </div>
          ) : (
            <div className="p-5 space-y-4">
              {topCompanies.map((c, i) => {
                const pct = topCompanies[0].gmv > 0 ? (c.gmv / topCompanies[0].gmv) * 100 : 0;
                return (
                  <div key={c.name}>
                    <div className="flex justify-between text-sm mb-1.5">
                      <span className="font-semibold" style={{ color: "var(--nomi-navy)" }}>
                        {i + 1}. {c.name}
                      </span>
                      <span className="font-black" style={{ color: "var(--nomi-orange)" }}>
                        {money(c.gmv)}
                      </span>
                    </div>
                    <div className="h-2 rounded-full" style={{ backgroundColor: "var(--nomi-border)" }}>
                      <div className="h-full rounded-full"
                        style={{ width: `${pct}%`, backgroundColor: "var(--nomi-orange)" }} />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
