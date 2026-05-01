"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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

export default function EmployeeOrderDetail() {
  const router = useRouter();
  const { id } = useParams();

  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [installments, setInstallments] = useState<any[]>([]);

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

      // order
      const { data: ord, error: ordErr } = await supabase
        .from("orders")
        .select("*")
        .eq("id", id)
        .single();

      if (ordErr || !ord) {
        setErr("No se pudo cargar la orden.");
        setLoading(false);
        return;
      }

      setOrder(ord);

      // items
      const { data: its } = await supabase
        .from("order_items")
        .select("id, name_snapshot, price_snapshot, qty")
        .eq("order_id", id);

      setItems(its || []);

      // installments
      const { data: inst } = await supabase
        .from("order_installments")
        .select("installment_number, due_date, amount, status, paid_at")
        .eq("order_id", id)
        .order("installment_number", { ascending: true });

      setInstallments(inst || []);

      setLoading(false);
    }

    load();
  }, [id, router]);

  if (loading) return <div className="text-slate-300">Cargando detalle...</div>;

  if (err) {
    return (
      <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
        {err}
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-4xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Orden #{order.id}</h1>
          <div className="text-sm text-slate-400">{fmtDateTime(order.created_at)}</div>
        </div>

        <Link
          href="/employee/orders"
          className="text-sm text-emerald-400 hover:text-emerald-300 font-semibold"
        >
          ← Volver
        </Link>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Estado</div>
          <div className="font-semibold">{order.status}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Total</div>
          <div className="text-emerald-300 text-xl font-bold">{money(order.subtotal)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Cuotas</div>
          <div className="font-semibold">{order.installments}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Valor/cuota</div>
          <div className="font-semibold">{money(order.installment_amount)}</div>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
        <div className="font-semibold mb-2">Ítems</div>
        {items.length === 0 ? (
          <div className="text-slate-400 text-sm">No hay ítems.</div>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div
                key={it.id}
                className="flex items-center justify-between border border-slate-800 bg-slate-950 rounded p-3"
              >
                <div className="min-w-0">
                  <div className="font-semibold truncate">{it.name_snapshot}</div>
                  <div className="text-xs text-slate-400">
                    {money(it.price_snapshot)} • Cant: {it.qty}
                  </div>
                </div>
                <div className="font-bold text-emerald-300">
                  {money(Number(it.price_snapshot || 0) * Number(it.qty || 0))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
        <div className="font-semibold mb-2">Calendario de cuotas</div>

        {installments.length === 0 ? (
          <div className="text-slate-400 text-sm">
            No hay calendario de cuotas (o aún no se ha generado).
          </div>
        ) : (
          <div className="space-y-2">
            {installments.map((c) => (
              <div
                key={c.installment_number}
                className="flex items-center justify-between border border-slate-800 bg-slate-950 rounded p-3 text-sm"
              >
                <div>
                  <div className="font-semibold">
                    Cuota {c.installment_number}
                  </div>
                  <div className="text-slate-400">
                    Vence: {c.due_date}
                  </div>
                </div>

                <div className="text-right">
                  <div className="font-bold text-emerald-300">{money(c.amount)}</div>
                  <div className="text-xs text-slate-400">{c.status}</div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}