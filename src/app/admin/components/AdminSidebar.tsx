"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  LayoutDashboard, Building2, Tag, Users, Package,
  ShoppingCart, BarChart2, CreditCard, Globe, List, LogOut,
} from "lucide-react";

const items = [
  { href: "/admin",             label: "Dashboard",     icon: LayoutDashboard },
  { href: "/admin/companies",   label: "Empresas",      icon: Building2 },
  { href: "/admin/brands",      label: "Marcas",        icon: Tag },
  { href: "/admin/employees",   label: "Empleados",     icon: Users },
  { href: "/admin/products",    label: "Productos",     icon: Package },
  { href: "/admin/categories",  label: "Categorias",    icon: List },
  { href: "/admin/website",     label: "Pagina web",    icon: Globe },
  { href: "/admin/orders",      label: "Ordenes",       icon: ShoppingCart },
  { href: "/admin/results",     label: "Resultados",    icon: BarChart2 },
  { href: "/admin/payments",    label: "Pagos",         icon: CreditCard },
];

export default function AdminSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--nomi-navy)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>

      {/* LOGO */}
      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xl font-black text-white">N</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black"
            style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
          <span className="text-xl font-black text-white">MI</span>
        </div>
        <div className="text-xs font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Super Admin
        </div>
      </div>

      {/* NAV */}
      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href ||
            (item.href !== "/admin" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href}
              onClick={onNavigate}
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

      {/* FOOTER */}
      <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <Link href="/market" target="_blank" onClick={onNavigate}
          className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition"
          style={{ color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}>
          <Globe className="w-4 h-4" />
          Ver marketplace
        </Link>
        <button onClick={logout}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
          style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.2)", backgroundColor: "rgba(248,113,113,0.08)" }}>
          <LogOut className="w-4 h-4" />
          Cerrar sesion
        </button>
      </div>
    </aside>
  );
}
