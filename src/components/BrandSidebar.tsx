"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import NomiLogo from "@/components/NomiLogo";
import {
  LayoutDashboard, Package, ShoppingCart, User,
  Tag, List, LogOut, Globe, BookOpen, PlusCircle,
} from "lucide-react";
import { useEffect, useState } from "react";

const productItems = [
  { href: "/brand",                label: "Dashboard",      icon: LayoutDashboard },
  { href: "/brand/product-brands", label: "Marcas",         icon: Tag },
  { href: "/brand/products",       label: "Crear producto", icon: Package },
  { href: "/brand/products/list",  label: "Mis productos",  icon: List },
  { href: "/brand/orders",         label: "Ordenes",        icon: ShoppingCart },
  { href: "/brand/profile",        label: "Mi perfil",      icon: User },
];

const courseItems = [
  { href: "/brand",              label: "Dashboard",   icon: LayoutDashboard },
  { href: "/brand/courses/new",  label: "Crear curso", icon: PlusCircle },
  { href: "/brand/courses",      label: "Mis cursos",  icon: BookOpen },
  { href: "/brand/orders",       label: "Ordenes",     icon: ShoppingCart },
  { href: "/brand/profile",      label: "Mi perfil",   icon: User },
];

export default function BrandSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [brandType, setBrandType] = useState<"PRODUCTS" | "COURSES">("PRODUCTS");

  useEffect(() => {
    async function detectType() {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data: userRow } = await supabase.from("users").select("brand_id").eq("auth_id", u.user.id).single();
      if (!userRow?.brand_id) return;
      const { data: brand } = await supabase.from("brands").select("brand_type").eq("id", userRow.brand_id).single();
      if (brand?.brand_type) setBrandType(brand.brand_type as any);
    }
    detectType();
  }, []);

  const items = brandType === "COURSES" ? courseItems : productItems;

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--nomi-navy)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>

      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <NomiLogo size="md" />
        <div className="text-xs font-semibold mt-1" style={{ color: "rgba(255,255,255,0.4)" }}>
          {brandType === "COURSES" ? "Panel de Cursos" : "Panel de Proveedor"}
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href ||
            (item.href !== "/brand" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href} onClick={onNavigate}
              className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition"
              style={active ? {
                backgroundColor: "rgba(245,166,35,0.15)",
                color: "var(--nomi-orange)",
                border: "1px solid rgba(245,166,35,0.25)",
              } : {
                color: "rgba(255,255,255,0.6)",
                border: "1px solid transparent",
              }}>
              <Icon className="w-4 h-4 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/market" target="_blank" onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition"
          style={{ color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}>
          <Globe className="w-4 h-4" />
          Ver marketplace
        </Link>
        <button onClick={handleLogout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
          style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.2)", backgroundColor: "rgba(248,113,113,0.08)" }}>
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
