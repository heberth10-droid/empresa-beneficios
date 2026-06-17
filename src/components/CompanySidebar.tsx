"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Settings, Users, ShoppingCart, LogOut, Globe, Landmark } from "lucide-react";

const items = [
  { href: "/company",                label: "Configuracion", icon: Settings },
  { href: "/company/employees",      label: "Empleados",     icon: Users },
  { href: "/company/orders",         label: "Ordenes",       icon: ShoppingCart },
  { href: "/company/installments",   label: "Cuotas",        icon: Landmark },
];

export default function CompanySidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--nomi-navy)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>

      <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center gap-1 mb-0.5">
          <span className="text-xl font-black text-white">N</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black"
            style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
          <span className="text-xl font-black text-white">MI</span>
        </div>
        <div className="text-xs font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>
          Panel de Empresa
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href ||
            (item.href !== "/company" && pathname.startsWith(item.href + "/"));
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
