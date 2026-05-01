"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

function Item({
  href,
  label,
}: {
  href: string;
  label: string;
}) {
  const pathname = usePathname();
  const active = pathname === href;

  return (
    <Link
      href={href}
      className={[
        "block px-4 py-2 rounded-lg transition",
        active
          ? "bg-emerald-500/15 text-emerald-200 border border-emerald-500/30"
          : "text-slate-300 hover:text-white hover:bg-slate-900 border border-transparent",
      ].join(" ")}
    >
      {label}
    </Link>
  );
}

export default function CompanySidebar() {
  return (
    <aside className="w-64 border-r border-slate-800 bg-slate-950 p-4 hidden md:block">
      <div className="mb-6">
        <div className="text-2xl font-bold text-emerald-400">NOVA</div>
        <div className="text-xs text-slate-500">Panel Empresa</div>
      </div>

      <nav className="space-y-2">
        <Item href="/company" label="Configuración" />
        <Item href="/company/employees" label="Empleados" />
        <Item href="/company/orders" label="Órdenes" />
      </nav>

      <div className="mt-8 text-xs text-slate-500">
        Configura nómina para calcular fechas de cuotas.
      </div>
    </aside>
  );
}