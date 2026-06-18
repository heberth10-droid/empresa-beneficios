"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Home, ShoppingBag, Bell, Settings, LogOut, ChevronLeft, Landmark, Menu, X, ShoppingCart } from "lucide-react";
import { useState } from "react";

const items = [
  { href: "/employee",               label: "Mi resumen",      icon: Home },
  { href: "/employee/orders",        label: "Mis ordenes",     icon: ShoppingBag },
  { href: "/employee/installments",  label: "Mis cuotas",      icon: Landmark },
  { href: "/employee/notifications", label: "Notificaciones",  icon: Bell },
  { href: "/employee/settings",      label: "Mi perfil",       icon: Settings },
];

export default function EmployeeSidebar({ onNavigate }: { onNavigate?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/market");
  }

  function NavItems({ onClick }: { onClick?: () => void }) {
    return (
      <>
        {items.map((item) => {
          const Icon = item.icon;
          const active = pathname === item.href ||
            (item.href !== "/employee" && pathname.startsWith(item.href + "/"));
          return (
            <Link key={item.href} href={item.href}
              onClick={onClick}
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
      </>
    );
  }

  return (
    <>
      {/* SIDEBAR DESKTOP */}
      <aside className="hidden md:flex w-64 min-h-screen flex-col"
        style={{ backgroundColor: "var(--nomi-navy)", borderRight: "1px solid rgba(255,255,255,0.08)" }}>

        <div className="px-5 py-5" style={{ borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <div className="flex items-center gap-1 mb-0.5">
            <span className="text-xl font-black text-white">N</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black"
              style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
            <span className="text-xl font-black text-white">MI</span>
          </div>
          <div className="text-xs font-semibold mt-0.5" style={{ color: "rgba(255,255,255,0.4)" }}>Mi portal</div>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-0.5 overflow-y-auto">
          <NavItems onClick={onNavigate} />
        </nav>

        <div className="px-3 py-4" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
          <Link href="/market" onClick={onNavigate}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold mb-1 transition"
            style={{ color: "rgba(255,255,255,0.4)", border: "1px solid transparent" }}>
            <ChevronLeft className="w-4 h-4" />
            Volver al marketplace
          </Link>
          <button onClick={logout}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer"
            style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.2)", backgroundColor: "rgba(248,113,113,0.08)" }}>
            <LogOut className="w-4 h-4" />
            Cerrar sesion
          </button>
        </div>
      </aside>

      {/* HEADER MOBILE */}
      <div className="md:hidden w-full sticky top-0 z-40"
        style={{ backgroundColor: "var(--nomi-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="flex items-center justify-between px-4 py-3">
          {/* LOGO */}
          <div className="flex items-center gap-1">
            <span className="text-lg font-black text-white">N</span>
            <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-xs font-black"
              style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
            <span className="text-lg font-black text-white">MI</span>
            <span className="text-xs ml-1 font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>· Mi portal</span>
          </div>

          <div className="flex items-center gap-3">
            {/* BOTON MARKETPLACE */}
            <Link href="/market"
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold"
              style={{ backgroundColor: "var(--nomi-teal)", color: "#fff" }}>
              <ShoppingCart className="w-3.5 h-3.5" />
              Marketplace
            </Link>
            {/* HAMBURGER */}
            <button onClick={() => setMobileOpen(!mobileOpen)} className="text-white cursor-pointer">
              {mobileOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* MENU MOBILE DESPLEGABLE */}
        {mobileOpen && (
          <div className="px-3 pb-4 space-y-0.5" style={{ borderTop: "1px solid rgba(255,255,255,0.08)", backgroundColor: "var(--nomi-navy-dark)" }}>
            <div className="pt-2">
              <NavItems onClick={() => setMobileOpen(false)} />
            </div>
            <div className="pt-2" style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
              <button onClick={logout}
                className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition cursor-pointer mt-1"
                style={{ color: "#F87171", border: "1px solid rgba(248,113,113,0.2)", backgroundColor: "rgba(248,113,113,0.08)" }}>
                <LogOut className="w-4 h-4" />
                Cerrar sesion
              </button>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
