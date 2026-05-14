"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function safeDateTime(iso?: string | null) {
  if (!iso) return "—";

  try {
    return new Date(iso).toLocaleString("es-CO");
  } catch {
    return String(iso);
  }
}

export default function OrderConfirmationPage() {
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

      const { data: o, error: oErr } = await supabase
        .from("orders")
        .select(
          "id, created_at, status, subtotal, installments, installment_amount, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_department, shipping_notes"
        )
        .eq("id", id)
        .single();

      if (oErr || !o) {
        setErrorMsg(oErr?.message || "No se pudo cargar la orden.");
        setLoading(false);
        return;
      }

      setOrder(o);

      const { data: its, error: itErr } = await supabase
        .from("order_items")
        .select(
          "id, product_id, name_snapshot, price_snapshot, qty"
        )
        .eq("order_id", id)
        .order("created_at", { ascending: true });

      if (itErr) {
        setErrorMsg(
          "No se pudo cargar el detalle de productos: " + itErr.message
        );
        setLoading(false);
        return;
      }

      setItems(its || []);

      const pids = Array.from(
        new Set(
          (its || [])
            .map((x: any) => x.product_id)
            .filter(Boolean)
        )
      );

      if (pids.length > 0) {
        const { data: ps } = await supabase
          .from("products")
          .select("id, image_url, images, name")
          .in("id", pids);

        const map: Record<string, any> = {};

        for (const p of ps || []) {
          map[p.id] = p;
        }

        setProductsById(map);
      } else {
        setProductsById({});
      }

      const { data: inst, error: instErr } = await supabase
        .from("order_installments")
        .select(
          "installment_number, due_date, amount, status"
        )
        .eq("order_id", id)
        .order("installment_number", { ascending: true });

      if (instErr) {
        setErrorMsg(
          "No se pudo cargar el calendario de cuotas: " +
            instErr.message
        );
        setLoading(false);
        return;
      }

      setInstallments(inst || []);

      setLoading(false);
    }

    load();
  }, [id]);

  function getThumb(product: any) {
    if (
      product?.image_url &&
      typeof product.image_url === "string"
    ) {
      return product.image_url;
    }

    if (
      Array.isArray(product?.images) &&
      product.images.length > 0
    ) {
      return product.images[0];
    }

    if (
      typeof product?.images === "string" &&
      product.images.includes("http")
    ) {
      const first = product.images
        .split(",")[0]
        ?.trim();

      if (first) return first;
    }

    return "/no-image.png";
  }

  if (loading) {
    return (
      <div className="p-6 text-slate-500">
        Cargando confirmación...
      </div>
    );
  }

  if (errorMsg) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 text-sm">
          {errorMsg}
        </div>

        <Link
          href="/market"
          className="text-emerald-600 font-semibold"
        >
          Volver al catálogo
        </Link>
      </div>
    );
  }

  const cardClass =
    "border border-[#071A3A]/20 bg-white rounded-2xl p-5 shadow-sm";

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-3xl font-black text-slate-900">
            Compra confirmada ✅
          </h1>

          <p className="text-slate-500 text-sm mt-1">
            Orden #{order.id}
          </p>
        </div>

        <Link
          href="/market"
          className="bg-[#071A3A] text-white px-5 py-3 rounded-xl font-semibold hover:opacity-90 transition"
        >
          ← Seguir comprando
        </Link>
      </div>

      {/* RESUMEN */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className={cardClass}>
          <div className="text-xs text-slate-500 mb-1">
            Fecha y hora
          </div>

          <div className="font-bold text-slate-900">
            {safeDateTime(order.created_at)}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs text-slate-500 mb-1">
            Monto compra
          </div>

          <div className="text-emerald-600 text-2xl font-black">
            {money(total)}
          </div>
        </div>

        <div className={cardClass}>
          <div className="text-xs text-slate-500 mb-1">
            Estado
          </div>

          <div className="font-bold text-slate-900">
            {order.status}
          </div>
        </div>
      </div>

      {/* ENVÍO */}
      <div className={cardClass}>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Información de envío
        </h2>

        <div className="space-y-2 text-sm text-slate-700">
          <div>
            <b className="text-slate-900">Nombre:</b>{" "}
            {order.shipping_name || "—"}
          </div>

          <div>
            <b className="text-slate-900">Teléfono:</b>{" "}
            {order.shipping_phone || "—"}
          </div>

          <div>
            <b className="text-slate-900">Dirección:</b>{" "}
            {order.shipping_address || "—"}
          </div>

          <div>
            <b className="text-slate-900">Ciudad:</b>{" "}
            {order.shipping_city || "—"} /{" "}
            {order.shipping_department || "—"}
          </div>

          <div>
            <b className="text-slate-900">Notas:</b>{" "}
            {order.shipping_notes || "—"}
          </div>
        </div>
      </div>

      {/* PRODUCTOS */}
      <div className={cardClass}>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Resumen de la orden
        </h2>

        <div className="space-y-3">
          {items.map((it) => {
            const p = it.product_id
              ? productsById[it.product_id]
              : null;

            const img = getThumb(p);

            const lineTotal =
              Number(it.price_snapshot || 0) *
              Number(it.qty || 0);

            return (
              <div
                key={it.id}
                className="flex items-center gap-4 border border-[#071A3A]/15 bg-slate-50 rounded-xl p-3"
              >
                <img
                  src={img}
                  alt={it.name_snapshot}
                  className="w-16 h-16 rounded-lg border border-slate-200 object-cover bg-white"
                  onError={(e) => {
                    (
                      e.currentTarget as HTMLImageElement
                    ).src = "/no-image.png";
                  }}
                />

                <div className="flex-1 min-w-0">
                  <div className="font-bold text-slate-900 truncate">
                    {it.name_snapshot}
                  </div>

                  <div className="text-slate-500 text-sm">
                    {money(it.price_snapshot)} • Cant:{" "}
                    {it.qty}
                  </div>
                </div>

                <div className="text-right font-black text-emerald-600">
                  {money(lineTotal)}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* CUOTAS */}
      <div className={cardClass}>
        <h2 className="text-xl font-bold text-slate-900 mb-4">
          Calendario de cuotas
        </h2>

        {installments.length === 0 ? (
          <div className="text-red-600 text-sm">
            No se pudo cargar el calendario de cuotas
            (o aún no se ha generado).
          </div>
        ) : (
          <div className="space-y-2">
            {installments.map((c: any) => (
              <div
                key={c.installment_number}
                className="flex items-center justify-between text-sm border border-[#071A3A]/15 rounded-xl p-3 bg-slate-50"
              >
                <div className="text-slate-800 font-medium">
                  Cuota #{c.installment_number}
                </div>

                <div className="text-slate-500">
                  {c.due_date}
                </div>

                <div className="text-slate-900 font-bold">
                  {money(c.amount)}
                </div>
              </div>
            ))}
          </div>
        )}

        <div className="text-xs text-slate-500 mt-4">
          *Estas fechas se generan con base en la
          periodicidad y días de pago configurados
          por la empresa.
        </div>
      </div>
    </div>
  );
}