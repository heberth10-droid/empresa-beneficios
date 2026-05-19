"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

const items = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/companies", label: "Empresas" },
  { href: "/admin/brands", label: "Marcas" },
  { href: "/admin/employees", label: "Empleados" },
  { href: "/admin/products", label: "Productos" },
  { href: "/admin/categories", label: "Categorías" },
  { href: "/admin/website", label: "Página web" },
  { href: "/admin/orders", label: "Órdenes" },
  { href: "/admin/results", label: "Resultados" },
  { href: "/admin/payments", label: "Pagos" },
];

export default function AdminSidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-72 min-h-screen bg-slate-950 border-r border-slate-800 p-4 flex flex-col">
      <div className="mb-8">
        <div className="text-2xl font-black text-emerald-400">NOVA</div>
        <div className="text-xs text-slate-400">Súper Admin</div>
      </div>

      <nav className="space-y-2 flex-1">
        {items.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");

          return (
            <Link
              key={item.href}
              href={item.href}
              className={[
                "block px-4 py-2 rounded-lg text-sm transition",
                active
                  ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
                  : "text-slate-300 hover:bg-slate-900 hover:text-white",
              ].join(" ")}
            >
              {item.label}
            </Link>
          );
        })}
      </nav>

      <button
        onClick={logout}
        className="mt-6 px-4 py-2 rounded-lg bg-red-500/15 text-red-200 border border-red-500/30 hover:bg-red-500/25 text-sm"
      >
        Cerrar sesión
      </button>
    </aside>
  );
}
