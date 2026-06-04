"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminBrandsPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("brands")
        .select("*, products(id)")
        .order("created_at", { ascending: false });
      setRows(data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Marcas</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {rows.length} marca{rows.length !== 1 ? "s" : ""} registrada{rows.length !== 1 ? "s" : ""}
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {loading ? (
          [1,2,3].map(i => (
            <div key={i} className="h-36 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--nomi-border)" }} />
          ))
        ) : rows.map((b) => (
          <div key={b.id} className="bg-white rounded-2xl p-5 transition hover:shadow-md"
            style={{ border: "1.5px solid var(--nomi-border)" }}>
            <div className="h-16 flex items-center justify-center rounded-xl mb-4"
              style={{ backgroundColor: "var(--nomi-gray)" }}>
              {b.logo_url ? (
                <img src={b.logo_url} className="h-12 object-contain" alt={b.name} />
              ) : (
                <div className="w-12 h-12 rounded-full flex items-center justify-center text-lg font-black text-white"
                  style={{ backgroundColor: "var(--nomi-navy)" }}>
                  {(b.name || "M").charAt(0)}
                </div>
              )}
            </div>
            <div className="font-black text-sm mb-1" style={{ color: "var(--nomi-navy)" }}>
              {b.name || "Marca"}
            </div>
            <div className="flex items-center justify-between mt-2">
              <span className="text-xs font-semibold px-2 py-0.5 rounded-full"
                style={b.active
                  ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                  : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {b.active ? "Activa" : "Inactiva"}
              </span>
              <span className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>
                {b.products?.length || 0} productos
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
