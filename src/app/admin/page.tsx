"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminDashboardPage() {
  const [stats, setStats] = useState({
    companies: 0,
    brands: 0,
    employees: 0,
    products: 0,
    orders: 0,
    gmv: 0,
  });

  useEffect(() => {
    async function load() {
      const [
        companies,
        brands,
        employees,
        products,
        orders,
      ] = await Promise.all([
        supabase.from("companies").select("id", { count: "exact", head: true }),
        supabase.from("brands").select("id", { count: "exact", head: true }),
        supabase.from("employees").select("id", { count: "exact", head: true }),
        supabase.from("products").select("id", { count: "exact", head: true }),
        supabase.from("orders").select("id, subtotal"),
      ]);

      const gmv = (orders.data || []).reduce(
        (acc: number, o: any) => acc + Number(o.subtotal || 0),
        0
      );

      setStats({
        companies: companies.count || 0,
        brands: brands.count || 0,
        employees: employees.count || 0,
        products: products.count || 0,
        orders: orders.data?.length || 0,
        gmv,
      });
    }

    load();
  }, []);

  const cards = [
    ["Empresas", stats.companies],
    ["Marcas", stats.brands],
    ["Empleados", stats.employees],
    ["Productos", stats.products],
    ["Órdenes", stats.orders],
    ["GMV", money(stats.gmv)],
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-black">Dashboard Súper Admin</h1>
        <p className="text-slate-400">Vista general de la operación NOVA.</p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {cards.map(([label, value]) => (
          <div key={label} className="bg-slate-900 border border-slate-800 rounded-xl p-5">
            <div className="text-sm text-slate-400">{label}</div>
            <div className="text-2xl font-black text-emerald-400 mt-2">{value}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
