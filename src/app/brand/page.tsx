"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Package, ShoppingCart, TrendingUp, Tag } from "lucide-react";
import Link from "next/link";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function timeAgo(dateStr: string) {
  const diff = Date.now() - new Date(dateStr).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "Ahora mismo";
  if (m < 60) return `Hace ${m} min`;
  const h = Math.floor(m / 60);
  if (h < 24) return `Hace ${h}h`;
  return `Hace ${Math.floor(h / 24)}d`;
}

const statusColors: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
  DISPATCHED: { label: "Despachado", color: "#2563EB",            bg: "#DBEAFE" },
  DELIVERED:  { label: "Entregado",  color: "#16A34A",            bg: "#DCFCE7" },
  CONFIRMED:  { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
  PROCESSED:  { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
};

export default function BrandDashboard() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [stats, setStats] = useState({ products: 0, orders: 0, revenue: 0, brands: 0 });
  const [recentOrders, setRecentOrders] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userData, error: userError } = await supabase
        .from("users").select("*").eq("auth_id", user.id).single();
      if (userError || !userData || userData.role !== "BRAND_ADMIN") { router.push("/login"); return; }

      const { data: brandData, error: brandError } = await supabase
        .from("brands").select("*").eq("id", userData.brand_id).single();
      if (brandError || !brandData) { router.push("/login"); return; }

      setBrand(brandData);

      // Stats en paralelo
      const [{ count: prodCount }, { data: orderItems }, { count: brandCount }] = await Promise.all([
        supabase.from("products").select("id", { count: "exact", head: true }).eq("brand_id", brandData.id),
        supabase.from("order_items").select("price_snapshot, qty, order_id").eq("brand_id", brandData.id),
        supabase.from("product_brands").select("id", { count: "exact", head: true }).eq("seller_brand_id", brandData.id),
      ]);

      const revenue = (orderItems || []).reduce((a, it) =>
        a + Number(it.price_snapshot || 0) * Number(it.qty || 0), 0);

      // Últimas órdenes con items de esta marca
      const orderIds = [...new Set((orderItems || []).map((i: any) => i.order_id).filter(Boolean))].slice(0, 8);
      let recentOrdsData: any[] = [];
      if (orderIds.length > 0) {
        const { data: ords } = await supabase
          .from("orders")
          .select("id, created_at, status, brand_status, subtotal, shipping_city")
          .in("id", orderIds)
          .order("created_at", { ascending: false });
        recentOrdsData = ords || [];
      }

      setStats({ products: prodCount || 0, orders: orderIds.length, revenue, brands: brandCount || 0 });
      setRecentOrders(recentOrdsData);
      setLoading(false);
    }
    load();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="text-center">
        <div className="w-10 h-10 rounded-full border-2 border-t-transparent animate-spin mx-auto mb-3"
          style={{ borderColor: "var(--nomi-orange)" }} />
        <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>Cargando panel...</p>
      </div>
    </div>
  );

  const cards = [
    { label: "Productos activos", value: stats.products, icon: Package,      accent: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)",   href: "/brand/products/list" },
    { label: "Sub-marcas",        value: stats.brands,   icon: Tag,          accent: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)", href: "/brand/product-brands" },
    { label: "Ordenes",           value: stats.orders,   icon: ShoppingCart, accent: "var(--nomi-navy)",   bg: "var(--nomi-gray)",      href: "/brand/orders" },
    { label: "Revenue total",     value: money(stats.revenue), icon: TrendingUp, accent: "var(--nomi-teal)", bg: "var(--nomi-teal-bg)", href: "/brand/orders" },
  ];

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Panel de marca</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>
          {brand?.name}
        </h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Bienvenido a tu panel de gestion en NOMI
        </p>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {cards.map((c) => {
          const Icon = c.icon;
          return (
            <Link key={c.label} href={c.href}
              className="bg-white rounded-2xl p-5 transition hover:shadow-md block"
              style={{ border: "1.5px solid var(--nomi-border)" }}>
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>{c.label}</span>
                <div className="w-8 h-8 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: c.bg }}>
                  <Icon className="w-4 h-4" style={{ color: c.accent }} />
                </div>
              </div>
              <div className="text-2xl font-black" style={{ color: "var(--nomi-navy)" }}>{c.value}</div>
            </Link>
          );
        })}
      </div>

      {/* ULTIMAS ORDENES */}
      {recentOrders.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-black" style={{ color: "var(--nomi-navy)" }}>Ultimas ordenes</h2>
            <Link href="/brand/orders" className="text-xs font-bold" style={{ color: "var(--nomi-teal)" }}>
              Ver todas →
            </Link>
          </div>
          <div className="bg-white rounded-2xl overflow-hidden"
            style={{ border: "1.5px solid var(--nomi-border)" }}>
            {recentOrders.map((o) => {
              const st = statusColors[o.brand_status || o.status] || { label: o.brand_status || o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
              return (
                <Link key={o.id} href={`/brand/orders/${o.id}`}
                  className="flex items-center justify-between px-5 py-3.5 transition hover:bg-slate-50"
                  style={{ borderBottom: "1px solid var(--nomi-border)" }}>
                  <div>
                    <div className="font-bold text-xs" style={{ color: "var(--nomi-navy)" }}>
                      #{o.id.slice(0, 8)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                      {timeAgo(o.created_at)} · {o.shipping_city || "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <span className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                      {money(o.subtotal)}
                    </span>
                  </div>
                </Link>
              );
            })}
          </div>
        </div>
      )}

      {/* ACCIONES RAPIDAS */}
      <div>
        <h2 className="text-lg font-black mb-4" style={{ color: "var(--nomi-navy)" }}>Acciones rapidas</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { href: "/brand/product-brands", label: "Crear sub-marca", desc: "Agrega una nueva marca a tu catalogo", icon: Tag, color: "var(--nomi-teal)" },
            { href: "/brand/products",       label: "Crear producto",  desc: "Agrega un nuevo producto al marketplace", icon: Package, color: "var(--nomi-orange)" },
            { href: "/brand/products/list",  label: "Ver productos",   desc: "Revisa y edita tus productos activos", icon: List, color: "var(--nomi-navy)" },
          ].map((a) => {
            const Icon = a.icon;
            return (
              <Link key={a.href} href={a.href}
                className="bg-white rounded-2xl p-5 transition hover:shadow-md flex items-start gap-4"
                style={{ border: "1.5px solid var(--nomi-border)" }}>
                <div className="w-10 h-10 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: "var(--nomi-gray)" }}>
                  <Icon className="w-5 h-5" style={{ color: a.color }} />
                </div>
                <div>
                  <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{a.label}</div>
                  <div className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>{a.desc}</div>
                </div>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}

// Necesitamos importar List
import { List } from "lucide-react";
