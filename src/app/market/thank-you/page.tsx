"use client";

import { Suspense, useEffect, useState } from "react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function ThankYouPageContent() {
  const sp = useSearchParams();
  const router = useRouter();
  const orderId = sp.get("order");

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);

  useEffect(() => {
    async function load() {
      setErrorMsg(null);

      if (!orderId) {
        setErrorMsg("No se encontró el ID de la orden.");
        setLoading(false);
        return;
      }

      const { data: orderData, error: orderError } = await supabase
        .from("orders")
        .select("id, status, subtotal, installments, installment_amount, created_at")
        .eq("id", orderId)
        .single();

      if (orderError || !orderData) {
        setErrorMsg("No se pudo cargar la orden.");
        setLoading(false);
        return;
      }

      const { data: itemsData, error: itemsError } = await supabase
        .from("order_items")
        .select("id, name_snapshot, price_snapshot, qty")
        .eq("order_id", orderId)
        .order("created_at", { ascending: true });

      if (itemsError) {
        setErrorMsg("La orden cargó, pero no se pudieron cargar los productos.");
        setOrder(orderData);
        setItems([]);
        setLoading(false);
        return;
      }

      setOrder(orderData);
      setItems(itemsData || []);
      setLoading(false);
    }

    load();
  }, [orderId]);

  if (loading) {
    return (
      <div className="max-w-2xl mx-auto p-6 text-slate-300">
        Cargando confirmación...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="max-w-2xl mx-auto p-6 space-y-4">
        <h1 className="text-2xl font-bold text-red-300">Ups</h1>
        <p className="text-slate-300">{errorMsg}</p>

        <button
          onClick={() => router.push("/market")}
          className="px-6 py-3 rounded border border-slate-700 text-slate-200 hover:bg-slate-900 transition"
        >
          Volver al catálogo
        </button>
      </div>
    );
  }

  const subtotal = Number(order?.subtotal || 0);
  const installments = Number(order?.installments || 1);
  const installmentAmount = Number(order?.installment_amount || 0);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-emerald-400">¡Compra confirmada!</h1>
        <p className="text-slate-300 mt-1">Tu orden fue creada correctamente.</p>
      </div>

      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 space-y-2">
        <p className="text-slate-400 text-sm">
          <b>ID Orden:</b> {order.id}
        </p>
        <p className="text-slate-400 text-sm">
          <b>Estado:</b> {order.status}
        </p>

        <hr className="border-slate-800 my-2" />

        <div className="flex justify-between">
          <span className="text-slate-300">Total</span>
          <span className="text-emerald-400 font-bold">${subtotal.toFixed(2)}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-300">Cuotas</span>
          <span className="text-slate-100 font-semibold">{installments}</span>
        </div>

        <div className="flex justify-between">
          <span className="text-slate-300">Valor por cuota</span>
          <span className="text-slate-100 font-semibold">
            ${installmentAmount.toFixed(2)}
          </span>
        </div>
      </div>

      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
        <h2 className="font-semibold mb-3">Productos</h2>

        {items.length === 0 ? (
          <p className="text-slate-400 text-sm">No hay items en esta orden.</p>
        ) : (
          <div className="space-y-2">
            {items.map((it) => (
              <div key={it.id} className="flex justify-between text-sm">
                <span className="text-slate-200 truncate">
                  {it.name_snapshot} x {it.qty}
                </span>
                <span className="text-slate-300">
                  ${(Number(it.price_snapshot || 0) * Number(it.qty || 1)).toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="flex gap-3">
        <Link
          href="/market"
          className="px-6 py-3 rounded border border-slate-700 text-slate-200 hover:bg-slate-900 transition"
        >
          Volver al catálogo
        </Link>

        <Link
          href="/login"
          className="px-6 py-3 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition"
        >
          Iniciar sesión
        </Link>
      </div>
    </div>
  );
}

export default function ThankYouPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando confirmación...</div>}>
      <ThankYouPageContent />
    </Suspense>
  );
}