"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const [cats, subs] = await Promise.all([
        supabase.from("market_categories").select("*").order("name"),
        supabase.from("market_subcategories").select("*").order("name"),
      ]);

      setCategories(cats.data || []);
      setSubcategories(subs.data || []);
    }

    load();
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-black">Categorías y subcategorías</h1>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-xl font-bold mb-4">Categorías</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {categories.map((c) => (
            <div key={c.id} className="border border-slate-800 rounded-lg p-4">
              <div className="font-bold">{c.name}</div>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
        <h2 className="text-xl font-bold mb-4">Subcategorías</h2>
        {subcategories.map((s) => (
          <div key={s.id} className="border-b border-slate-800 py-3">
            <b>{s.name}</b> · <span className="text-slate-400">{s.category_name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
