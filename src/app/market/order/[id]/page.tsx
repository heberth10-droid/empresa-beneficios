"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

function safeDateTime(iso?: string | null) {
  if (!iso) return "—";
  try {
    return new Date(iso).toLocaleString();
  } catch {
    return String(iso);
  }
}

export default function OrderConfirmationPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [productsById, setProductsById] = useState<Record<string, any>>({});
  const [installments, setInstallments] = useState<any[]>([]);

  const total = useMemo(() => Number(order?.subtotal || 0), [order]);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);

      // Orden
      const { data: o, error: oErr } = await supabase
        .from("orders")
        .select("id, created_at, status, subtotal, installments, installment_amount, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_department, shipping_notes")
        .eq("id", id)
        .single();

      if (oErr || !o) {
        setErrorMsg(oErr?.message || "No se pudo cargar la orden.");
        setLoading(false);
        return;
      }
      setOrder(o);

      // Items
      const { data: its, error: itErr } = await supabase
        .from("order_items")
        .select("id, product_id, name_snapshot, price_snapshot, qty")
        .eq("order_id", id)
        .order("created_at", { ascending: true });

      if (itErr) {
        setErrorMsg("No se pudo cargar el detalle de productos: " + itErr.message);
        setLoading(false);
        return;
      }
      setItems(its || []);

      // Productos para miniaturas (solo ids presentes)
      const pids = Array.from(new Set((its || []).map((x: any) => x.product_id).filter(Boolean)));
      if (pids.length > 0) {
        const { data: ps } = await supabase
          .from("products")
          .select("id, image_url, images, name")
          .in("id", pids);

        const map: Record<string, any> = {};
        for (const p of ps || []) map[p.id] = p;
        setProductsById(map);
      } else {
        setProductsById({});
      }

      // Cuotas (tabla nueva)
      const { data: inst, error: instErr } = await supabase
        .from("order_installments")
        .select("installment_number, due_date, amount, status")
        .eq("order_id", id)
        .order("installment_number", { ascending: true });

      if (instErr) {
        setErrorMsg("No se pudo cargar el calendario de cuotas: " + instErr.message);
        setLoading(false);
        return;
      }

      // Si está vacío, mostramos el mismo mensaje, pero ya no debería pasar
      setInstallments(inst || []);

      setLoading(false);
    }

    load();
  }, [id]);

  function getThumb(product: any) {
    // prioridad 1: image_url string
    if (product?.image_url && typeof product.image_url === "string") return product.image_url;

    // prioridad 2: images array
    if (Array.isArray(product?.images) && product.images.length > 0) return product.images[0];

    // prioridad 3: images string csv
    if (typeof product?.images === "string" && product.images.includes("http")) {
      const first = product.images.split(",")[0]?.trim();
      if (first) return first;
    }

    return "/no-image.png";
  }

  if (loading) return <div className="p-6 text-slate-300">Cargando confirmación...</div>;

  if (errorMsg) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
        <Link href="/market" className="text-emerald-400 font-semibold">
          Volver al catálogo
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Compra confirmada ✅</h1>
          <p className="text-slate-400 text-sm">Orden #{order.id}</p>
        </div>

        <Link href="/market" className="text-emerald-400 font-semibold">
          ← Seguir comprando
        </Link>
      </div>

      {/* Resumen */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Fecha y hora</div>
          <div className="font-semibold">{safeDateTime(order.created_at)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Monto compra</div>
          <div className="text-emerald-300 text-xl font-bold">{money(total)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-xs text-slate-400">Estado</div>
          <div className="font-semibold">{order.status}</div>
        </div>
      </div>

      {/* Envío */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-2">
        <h2 className="text-lg font-semibold">Envío</h2>
        <div className="text-sm text-slate-300">
          <div><b>Nombre:</b> {order.shipping_name || "—"}</div>
          <div><b>Teléfono:</b> {order.shipping_phone || "—"}</div>
          <div><b>Dirección:</b> {order.shipping_address || "—"}</div>
          <div><b>Ciudad:</b> {order.shipping_city || "—"} / {order.shipping_department || "—"}</div>
          <div><b>Notas:</b> {order.shipping_notes || "—"}</div>
        </div>
      </div>

      {/* Productos */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold">Resumen de la orden</h2>

        <div className="space-y-3">
          {items.map((it) => {
            const p = it.product_id ? productsById[it.product_id] : null;
            const img = getThumb(p);
            const lineTotal = Number(it.price_snapshot || 0) * Number(it.qty || 0);

            return (
              <div
                key={it.id}
                className="flex items-center gap-4 border border-slate-800 bg-slate-950/40 rounded-lg p-3"
              >
                <img
                  src={img}
                  alt={it.name_snapshot}
                  className="w-16 h-16 rounded border border-slate-800 object-cover"
                  onError={(e) => {
                    (e.currentTarget as HTMLImageElement).src = "/no-image.png";
                  }}
                />
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{it.name_snapshot}</div>
                  <div className="text-slate-400 text-sm">
                    {money(it.price_snapshot)} • Cant: {it.qty}
                  </div>
                </div>
                <div className="text-right font-bold text-emerald-300">
                  {money(lineTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Cuotas */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold">Calendario de cuotas</h2>

        {installments.length === 0 ? (
          <div className="text-red-300 text-sm">
            No se pudo cargar el calendario de cuotas (o aún no se ha generado).
          </div>
        ) : (
          <div className="space-y-2">
            {installments.map((c: any) => (
              <div
                key={c.installment_number}
                className="flex items-center justify-between text-sm border border-slate-800 rounded p-2 bg-slate-950/40"
              >
                <div className="text-slate-200">Cuota #{c.installment_number}</div>
                <div className="text-slate-400">{c.due_date}</div>
                <div className="text-slate-100 font-semibold">{money(c.amount)}</div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500">
          *Estas fechas se generan con base en la periodicidad y días de pago configurados por la empresa.
        </div>
      </div>
    </div>
  );
}