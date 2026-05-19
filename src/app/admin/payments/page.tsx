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

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("order_items")
        .select("*, products(name, cost, brand_id, brands(name))")
        .order("created_at", { ascending: false });

      setItems(data || []);
    }

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Pagos por marca</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
        {items.map((it) => {
          const cost = Number(it.products?.cost || 0);
          const qty = Number(it.qty || 0);

          return (
            <div key={it.id} className="p-4 border-b border-slate-800 grid grid-cols-1 md:grid-cols-4 gap-3">
              <div>{it.products?.brands?.name || "Marca"}</div>
              <div>{it.name_snapshot}</div>
              <div>Cantidad: {qty}</div>
              <div className="text-emerald-400 font-bold">
                Subtotal costo: {money(cost * qty)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
