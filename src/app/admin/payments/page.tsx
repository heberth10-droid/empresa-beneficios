"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminPaymentsPage() {
  const [items, setItems] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("order_items")
        .select("*, products(name, cost, brand_id, brands(name))")
        .order("created_at", { ascending: false });
      setItems(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const byBrand = useMemo(() => {
    const map = new Map<string, { name: string; items: number; totalCost: number; totalRevenue: number }>();
    for (const it of items) {
      const brandName = it.products?.brands?.name || "Sin marca";
      const cost = Number(it.products?.cost || 0) * Number(it.qty || 0);
      const revenue = Number(it.unit_price || 0) * Number(it.qty || 0);
      if (!map.has(brandName)) map.set(brandName, { name: brandName, items: 0, totalCost: 0, totalRevenue: 0 });
      const entry = map.get(brandName)!;
      entry.items += Number(it.qty || 0);
      entry.totalCost += cost;
      entry.totalRevenue += revenue;
    }
    return Array.from(map.values()).sort((a, b) => b.totalRevenue - a.totalRevenue);
  }, [items]);

  const totalRevenue = byBrand.reduce((a, b) => a + b.totalRevenue, 0);
  const totalCost = byBrand.reduce((a, b) => a + b.totalCost, 0);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Finanzas</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Pagos por marca</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Consolidado de ventas agrupado por marca
        </p>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {[
          { label: "Ingresos totales", value: money(totalRevenue), color: "var(--nomi-teal)", bg: "var(--nomi-teal-bg)" },
          { label: "Costo total marcas", value: money(totalCost), color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
          { label: "Margen bruto", value: money(totalRevenue - totalCost), color: "var(--nomi-navy)", bg: "var(--nomi-gray)" },
        ].map((s) => (
          <div key={s.label} className="bg-white rounded-2xl p-5"
            style={{ border: "1.5px solid var(--nomi-border)" }}>
            <div className="text-xs font-semibold mb-2" style={{ color: "var(--nomi-muted)" }}>{s.label}</div>
            <div className="text-2xl font-black" style={{ color: s.color }}>{loading ? "—" : s.value}</div>
          </div>
        ))}
      </div>

      {/* TABLA POR MARCA */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-4 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span>Marca</span>
          <span className="text-right">Unidades</span>
          <span className="text-right">Costo</span>
          <span className="text-right">Ingresos</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : byBrand.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No hay datos de pagos aun
          </div>
        ) : byBrand.map((b) => (
          <div key={b.name}
            className="grid grid-cols-4 px-5 py-3.5 items-center transition hover:bg-slate-50"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-black text-white shrink-0"
                style={{ backgroundColor: "var(--nomi-navy)" }}>
                {b.name.charAt(0).toUpperCase()}
              </div>
              <span className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>{b.name}</span>
            </div>
            <div className="text-right font-semibold text-sm" style={{ color: "var(--nomi-muted)" }}>
              {b.items}
            </div>
            <div className="text-right font-semibold text-sm" style={{ color: "var(--nomi-orange)" }}>
              {money(b.totalCost)}
            </div>
            <div className="text-right font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
              {money(b.totalRevenue)}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
