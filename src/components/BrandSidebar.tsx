"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

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

export default function BrandSidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-900/40 backdrop-blur p-4">
      <div className="mb-6">
        <div className="text-2xl font-extrabold text-emerald-400">NOVA</div>
        <div className="text-xs text-slate-400">Panel de Marca</div>
      </div>

      <nav className="space-y-2">
        <Item href="/brand" label="Dashboard" />
        <Item href="/brand/products" label="Productos" />
        <Item href="/brand/orders" label="Órdenes" />
      </nav>

      <div className="mt-8 pt-4 border-t border-slate-800 text-xs text-slate-500">
        ©️ {new Date().getFullYear()} NOVA
      </div>
    </aside>
  );
}