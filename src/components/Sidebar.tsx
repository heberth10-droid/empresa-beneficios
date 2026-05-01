"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building2,
  Tags,
  Users,
  LayoutDashboard,
  PackageSearch,
  ClipboardList,
  Settings,
  LogOut
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";

export default function Sidebar() {
  const pathname = usePathname();

  const linkClasses = (path: string) =>
    `flex items-center gap-3 px-4 py-2 rounded-md text-sm transition ${
      pathname === path
        ? "bg-emerald-500 text-slate-900 font-semibold"
        : "text-slate-300 hover:bg-slate-800 hover:text-white"
    }`;

  async function handleLogout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  return (
    <aside className="w-64 h-screen bg-slate-900 border-r border-slate-800 p-5 flex flex-col">
      
      {/* LOGO */}
      <div className="mb-8">
        <h1 className="text-xl font-bold text-emerald-400 tracking-wide">
          NOVA Admin
        </h1>
      </div>

      {/* MENÚ */}
      <nav className="flex-1 space-y-2">
        <Link href="/admin" className={linkClasses("/admin")}>
          <LayoutDashboard size={18} /> Dashboard
        </Link>

        <Link href="/admin/companies" className={linkClasses("/admin/companies")}>
          <Building2 size={18} /> Empresas
        </Link>

        <Link href="/admin/brands" className={linkClasses("/admin/brands")}>
          <Tags size={18} /> Marcas
        </Link>

        <Link href="/admin/employees" className={linkClasses("/admin/employees")}>
          <Users size={18} /> Empleados
        </Link>

        <Link href="/admin/products" className={linkClasses("/admin/products")}>
          <PackageSearch size={18} /> Productos
        </Link>

        <Link href="/admin/orders" className={linkClasses("/admin/orders")}>
          <ClipboardList size={18} /> Pedidos
        </Link>

        <Link href="/admin/settings" className={linkClasses("/admin/settings")}>
          <Settings size={18} /> Configuración
        </Link>
      </nav>

      {/* CERRAR SESIÓN */}
      <button
        onClick={handleLogout}
        className="flex items-center gap-3 px-4 py-2 rounded-md text-sm text-red-400 hover:bg-slate-800 mt-4"
      >
        <LogOut size={18} /> Cerrar sesión
      </button>
    </aside>
  );
}
