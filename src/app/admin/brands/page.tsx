"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminBrandsPage() {
  const [rows, setRows] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      setRows(data || []);
    }

    load();
  }, []);

  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Marcas</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {rows.map((b) => (
          <div key={b.id} className="bg-slate-900 border border-slate-800 rounded-xl p-4">
            {b.logo_url && (
              <img src={b.logo_url} className="h-14 object-contain bg-white rounded p-2 mb-3" />
            )}
            <div className="font-bold">{b.name || "Marca"}</div>
            <div className="text-sm text-slate-400">{b.active ? "Activa" : "Inactiva"}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
