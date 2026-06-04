"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<any[]>([]);
  const [subcategories, setSubcategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const [cats, subs] = await Promise.all([
        supabase.from("market_categories").select("*").order("sort_order").order("name"),
        supabase.from("market_subcategories").select("*").order("sort_order").order("name"),
      ]);
      setCategories(cats.data || []);
      setSubcategories(subs.data || []);
      setLoading(false);
    }
    load();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>
          Categorias y subcategorias
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {categories.length} categorias · {subcategories.length} subcategorias
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* CATEGORIAS */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Categorias</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }}>
              {categories.length}
            </span>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              {[1,2,3].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
            </div>
          ) : (
            <div>
              {categories.map((c) => {
                const subCount = subcategories.filter(
                  s => s.category_name?.toLowerCase() === c.name?.toLowerCase()
                ).length;
                return (
                  <div key={c.id} className="flex items-center gap-3 px-5 py-3 transition hover:bg-slate-50"
                    style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                    {c.image_url && (
                      <img src={c.image_url} className="w-9 h-9 rounded-xl object-cover shrink-0"
                        style={{ border: "1px solid var(--nomi-border)" }} />
                    )}
                    <div className="flex-1">
                      <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>{c.name}</div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                        {subCount} subcategoria{subCount !== 1 ? "s" : ""}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                      style={c.active
                        ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                        : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                      {c.active ? "Activa" : "Inactiva"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SUBCATEGORIAS */}
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <div className="px-5 py-4 flex items-center justify-between"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Subcategorias</h2>
            <span className="text-xs font-bold px-2.5 py-1 rounded-full"
              style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
              {subcategories.length}
            </span>
          </div>
          {loading ? (
            <div className="p-5 space-y-2">
              {[1,2,3,4].map(i => <div key={i} className="h-10 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
            </div>
          ) : (
            <div className="max-h-[500px] overflow-y-auto">
              {subcategories.map((s) => (
                <div key={s.id} className="flex items-center justify-between px-5 py-3 transition hover:bg-slate-50"
                  style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                  <div>
                    <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>{s.name}</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{s.category_name}</div>
                  </div>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={s.active
                      ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                      : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    {s.active ? "Activa" : "Inactiva"}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
