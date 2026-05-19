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

export default function AdminResultsPage() {
  const [stats, setStats] = useState<any>({
    gmv: 0,
    orders: 0,
    avgTicket: 0,
    totalCreditLimit: 0,
  });

  useEffect(() => {
    async function load() {
      const [{ data: orders }, { data: employees }] = await Promise.all([
        supabase.from("orders").select("subtotal"),
        supabase.from("employees").select("credit_limit"),
      ]);

      const gmv = (orders || []).reduce((a: number, o: any) => a + Number(o.subtotal || 0), 0);
      const totalCreditLimit = (employees || []).reduce((a: number, e: any) => a + Number(e.credit_limit || 0), 0);

      setStats({
        gmv,
        orders: orders?.length || 0,
        avgTicket: orders?.length ? gmv / orders.length : 0,
        totalCreditLimit,
      });
    }

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Resultados</h1>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-slate-400 text-sm">GMV</div>
          <div className="text-2xl font-black text-emerald-400">{money(stats.gmv)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-slate-400 text-sm">Órdenes</div>
          <div className="text-2xl font-black">{stats.orders}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-slate-400 text-sm">Ticket promedio</div>
          <div className="text-2xl font-black">{money(stats.avgTicket)}</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <div className="text-slate-400 text-sm">Cupos disponibles/mes</div>
          <div className="text-2xl font-black">{money(stats.totalCreditLimit)}</div>
        </div>
      </div>
    </div>
  );
}
