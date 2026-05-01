"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Item({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "block px-3 py-2 rounded-lg text-sm transition",
        active
          ? "bg-emerald-500 text-slate-950 font-semibold"
          : "text-slate-200 hover:bg-slate-900 hover:text-white",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function EmployeeSidebar() {
  const router = useRouter();

  async function logout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 p-4 hidden md:block">
      <div className="mb-6">
        <div className="text-2xl font-bold text-emerald-400">NOVA</div>
        <div className="text-xs text-slate-400">Portal del Empleado</div>
      </div>

      <div className="space-y-2">
        <Item href="/employee" label="Resumen" />
        <Item href="/employee/orders" label="Mis órdenes" />
        <Item href="/employee/notifications" label="Notificaciones" />
        <Item href="/employee/settings" label="Configuración" />
        <Item href="/market" label="Ir al Marketplace" />
      </div>

      <div className="mt-8 pt-4 border-t border-slate-800">
        <button
          onClick={logout}
          className="w-full text-left px-3 py-2 rounded-lg text-sm text-slate-200 hover:bg-slate-900 hover:text-white transition"
        >
          Cerrar sesión
        </button>
      </div>
    </aside>
  );
}