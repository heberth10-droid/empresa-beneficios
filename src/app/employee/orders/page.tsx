"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}
function fmtDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function EmployeeOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [employeeId, setEmployeeId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [q, setQ] = useState("");

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErr(null);

      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userRow } = await supabase
        .from("users")
        .select("role, company_id")
        .eq("auth_id", user.id)
        .single();

      if (!userRow || userRow.role !== "EMPLOYEE" || !userRow.company_id) {
        router.push("/login");
        return;
      }

      const { data: emp, error: empErr } = await supabase
        .from("employees")
        .select("id")
        .eq("company_id", userRow.company_id)
        .eq("email", user.email)
        .single();

      if (empErr || !emp) {
        setErr("No se encontró tu registro de empleado.");
        setLoading(false);
        return;
      }

      setEmployeeId(emp.id);

      const { data: ords, error: ordErr } = await supabase
        .from("orders")
        .select("id, created_at, status, subtotal, installments, installment_amount")
        .eq("employee_id", emp.id)
        .order("created_at", { ascending: false });

      if (ordErr) {
        setErr("No se pudieron cargar tus órdenes: " + ordErr.message);
        setLoading(false);
        return;
      }

      setOrders(ords || []);
      setLoading(false);
    }

    load();
  }, [router]);

  const filtered = useMemo(() => {
    const x = q.trim().toLowerCase();
    if (!x) return orders;
    return orders.filter((o) => {
      const hay = [o.id, o.status].join(" ").toLowerCase();
      return hay.includes(x);
    });
  }, [orders, q]);

  if (loading) return <div className="text-slate-300">Cargando órdenes...</div>;
  if (err) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
        {err}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Mis órdenes</h1>
          <p className="text-slate-400 text-sm">Total: {orders.length}</p>
        </div>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por estado o ID..."
          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm"
        />
      </div>

      {filtered.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-6 text-slate-300">
          No tienes órdenes aún.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => (
            <Link
              key={o.id}
              href={`/employee/orders/${o.id}`}
              className="block border border-slate-800 bg-slate-900 rounded-lg p-4 hover:border-emerald-500 transition"
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-semibold">Orden #{o.id}</div>
                  <div className="text-xs text-slate-400">{fmtDateTime(o.created_at)}</div>
                </div>
                <div className="px-2 py-1 rounded border border-slate-700 text-sm">
                  {o.status}
                </div>
              </div>

              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-3 text-sm">
                <div>
                  <div className="text-xs text-slate-400">Total</div>
                  <div className="font-bold text-emerald-300">{money(o.subtotal)}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Cuotas</div>
                  <div className="font-semibold">{o.installments}</div>
                </div>
                <div>
                  <div className="text-xs text-slate-400">Valor/cuota</div>
                  <div className="font-semibold">{money(o.installment_amount)}</div>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}