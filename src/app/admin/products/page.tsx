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

export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .order("created_at", { ascending: false });

      setRows(data || []);
    }

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Productos</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {rows.map((p) => {
          const price = Number(p.price || 0);
          const cost = Number(p.cost || 0);
          const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : 0;

          return (
            <div key={p.id} className="p-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-5 gap-3">
              <div className="md:col-span-2">
                <div className="font-bold">{p.name}</div>
                <div className="text-sm text-slate-400">{p.sku}</div>
              </div>
              <div>{money(price)}</div>
              <div>Costo: {money(cost)}</div>
              <div className="text-emerald-400 font-bold">
                Margen: {margin.toFixed(1)}%
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
