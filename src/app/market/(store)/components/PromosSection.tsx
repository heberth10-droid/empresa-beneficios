"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import PromoCarousel from "./PromoCarousel";

type PromoRow = {
  id: string;
  title: string | null;
  image_url: string;
  href: string | null;
  active: boolean;
  starts_at: string | null;
  ends_at: string | null;
  sort_order: number;
  created_at: string;
};

export default function PromosSection() {
  const [loading, setLoading] = useState(true);
  const [rows, setRows] = useState<PromoRow[]>([]);

  useEffect(() => {
    async function load() {
      setLoading(true);

      const { data, error } = await supabase
        .from("promos")
        .select(
          "id,title,image_url,href,active,starts_at,ends_at,sort_order,created_at"
        )
        .eq("active", true)
        .order("sort_order", { ascending: true })
        .order("created_at", { ascending: false })
        .limit(20);

      setLoading(false);

      if (error) {
        console.error("Promos error:", error.message);
        setRows([]);
        return;
      }

      setRows((data || []) as PromoRow[]);
    }

    load();
  }, []);

  const items = useMemo(() => {
    const now = Date.now();

    return (rows || [])
      .filter((p) => {
        if (!p.active) return false;
        if (p.starts_at && now < new Date(p.starts_at).getTime()) return false;
        if (p.ends_at && now > new Date(p.ends_at).getTime()) return false;
        return true;
      })
      .map((p) => ({
        id: p.id,
        image: p.image_url,
        href: p.href || undefined,
        alt: p.title || "Promoción NOVA",
      }));
  }, [rows]);

  // ✅ Solo se muestra si hay promos reales
  if (loading) return null;
  if (!items || items.length === 0) return null;

  return <PromoCarousel items={items} autoplayMs={6000} />;
}