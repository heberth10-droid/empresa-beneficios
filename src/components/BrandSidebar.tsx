"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function Item({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href || pathname.startsWith(href + "/");

  return (
    <Link
      href={href}
      className={[
        "block px-4 py-2 rounded-lg text-sm transition",
        active
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          : "text-slate-300 hover:text-white hover:bg-slate-900/60",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

function SubItem({ href, label }: { href: string; label: string }) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "block px-4 py-2 rounded-lg text-xs transition ml-3",
        active
          ? "bg-emerald-500/15 text-emerald-300 border border-emerald-500/30"
          : "text-slate-400 hover:text-white hover:bg-slate-900/60",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function BrandSidebar() {
  const router = useRouter();

  async function handleLogout() {
    await supabase.auth.signOut();
    router.push("/login");
  }

  return (
    <aside className="w-64 flex flex-col justify-between border-r border-slate-800 bg-slate-900/40 backdrop-blur p-4">
      {/* TOP */}
      <div>
        <div className="mb-6">
          <div className="text-2xl font-extrabold text-emerald-400">NOVA</div>
          <div className="text-xs text-slate-400">Panel de Marca</div>
        </div>

        <nav className="space-y-2">
          <Item href="/brand" label="Dashboard" />

          <div className="space-y-1">
            <div className="px-4 pt-2 pb-1 text-xs font-bold uppercase tracking-wide text-slate-500">
              Productos
            </div>
            <SubItem href="/brand/products" label="Crear producto" />
            <SubItem href="/brand/products/list" label="Listado de productos" />
          </div>

          <Item href="/brand/orders" label="Órdenes" />
        </nav>
      </div>

      {/* BOTTOM */}
      <div className="space-y-2 pt-6 border-t border-slate-800">
        <Item href="/brand/profile" label="Mi perfil" />

        <button
          onClick={handleLogout}
          className="w-full text-left px-4 py-2 rounded-lg text-sm text-red-400 hover:text-red-300 hover:bg-red-500/10 transition"
        >
          Cerrar sesión
        </button>

        <div className="text-xs text-slate-500 mt-2">
          ©️ {new Date().getFullYear()} NOVA
        </div>
      </div>
    </aside>
  );
}