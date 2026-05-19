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

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

      setRows(data || []);
    }

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Órdenes</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {rows.map((o) => (
          <div key={o.id} className="p-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
            <div className="font-bold">#{o.id}</div>
            <div>{o.status}</div>
            <div>{money(o.subtotal)}</div>
            <div className="text-slate-400">{new Date(o.created_at).toLocaleString("es-CO")}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
