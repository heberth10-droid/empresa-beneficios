"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function AdminProductsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("products")
        .select("*, product_brands(name)")
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  const filtered = useMemo(() => {
    if (!search.trim()) return rows;
    const q = search.toLowerCase();
    return rows.filter((p) =>
      (p.name || "").toLowerCase().includes(q) ||
      (p.category || "").toLowerCase().includes(q) ||
      (p.product_brands?.name || "").toLowerCase().includes(q)
    );
  }, [rows, search]);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Productos</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {filtered.length} de {rows.length} productos
        </p>
      </div>

      <input
        type="text" placeholder="Buscar por nombre, categoria o marca..."
        value={search} onChange={(e) => setSearch(e.target.value)}
        className="w-full max-w-md px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}
      />

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-6 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span className="col-span-2">Producto</span>
          <span>Marca</span>
          <span>Precio</span>
          <span>Margen</span>
          <span className="text-right">Stock</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4].map(i => <div key={i} className="h-14 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No se encontraron productos
          </div>
        ) : filtered.map((p) => {
          const price = Number(p.price || 0);
          const cost = Number(p.cost || 0);
          const margin = price > 0 && cost > 0 ? ((price - cost) / price) * 100 : 0;
          const stock = Number(p.stock || 0);
          const img = p.image_url || (Array.isArray(p.images) ? p.images[0] : null);

          return (
            <div key={p.id}
              className="grid grid-cols-6 px-5 py-3.5 items-center transition hover:bg-slate-50"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div className="col-span-2 flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                  {img
                    ? <img src={img} className="w-full h-full object-cover" onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
                    : <div className="w-full h-full flex items-center justify-center text-lg">📦</div>
                  }
                </div>
                <div>
                  <div className="font-bold text-sm truncate max-w-[160px]" style={{ color: "var(--nomi-navy)" }}>
                    {p.name || "Producto"}
                  </div>
                  <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                    {p.category || "Sin categoria"}
                  </div>
                </div>
              </div>
              <div className="text-sm truncate" style={{ color: "var(--nomi-muted)" }}>
                {p.product_brands?.name || "—"}
              </div>
              <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>
                {money(price)}
              </div>
              <div>
                <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                  style={margin > 20
                    ? { backgroundColor: "#DCFCE7", color: "#16A34A" }
                    : margin > 0
                    ? { backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }
                    : { backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" }}>
                  {margin > 0 ? `${margin.toFixed(1)}%` : "—"}
                </span>
              </div>
              <div className="text-right">
                <span className="text-sm font-bold"
                  style={{ color: stock > 0 ? "var(--nomi-teal)" : "#DC2626" }}>
                  {stock}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
