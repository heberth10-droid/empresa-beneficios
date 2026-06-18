"use client";

import { useEffect, useMemo, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function fmtDate(iso?: string | null) {
  if (!iso) return "-";
  return new Date(iso).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" });
}

function getThumb(p: any) {
  if (p?.image_url) return p.image_url;
  if (Array.isArray(p?.images) && p.images.length > 0) return p.images[0];
  if (typeof p?.images === "string" && p.images.includes("http")) return p.images.split(",")[0]?.trim();
  return "/no-image.png";
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

      const { data: o, error: oErr } = await supabase.from("orders")
        .select("id, created_at, status, subtotal, installments, installment_amount, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_department, shipping_notes")
        .eq("id", id).maybeSingle();

      if (oErr || !o) { setErrorMsg(oErr?.message || "No se pudo cargar la orden."); setLoading(false); return; }
      setOrder(o);

      const { data: its } = await supabase.from("order_items")
        .select("id, product_id, name_snapshot, price_snapshot, qty")
        .eq("order_id", id).order("created_at", { ascending: true });
      setItems(its || []);

      const pids = Array.from(new Set((its || []).map((x: any) => x.product_id).filter(Boolean)));
      if (pids.length > 0) {
        const { data: ps } = await supabase.from("products").select("id, image_url, images, name").in("id", pids);
        const map: Record<string, any> = {};
        for (const p of ps || []) map[p.id] = p;
        setProductsById(map);
      }

      const { data: inst } = await supabase.from("order_installments")
        .select("installment_number, due_date, amount, status")
        .eq("order_id", id).order("installment_number", { ascending: true });
      setInstallments(inst || []);

      setLoading(false);
    }
    load();
  }, [id]);

  const statusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:   { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    CONFIRMED: { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    PROCESSED: { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
    DELIVERED: { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
    CANCELLED: { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
  };

  const instStatusCfg: Record<string, { label: string; color: string; bg: string }> = {
    PENDING: { label: "Pendiente", color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    PAID:    { label: "Pagada",    color: "#16A34A",            bg: "#DCFCE7" },
    OVERDUE: { label: "Vencida",   color: "#DC2626",            bg: "#FEE2E2" },
  };

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (errorMsg) return (
    <div className="max-w-2xl mx-auto px-4 py-10 space-y-4">
      <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{errorMsg}</div>
      <Link href="/market" className="text-sm font-semibold" style={{ color: "var(--nomi-orange)" }}>Volver al catalogo</Link>
    </div>
  );

  const sc = statusCfg[order.status] || { label: order.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      {/* HEADER */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Marketplace</p>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Compra confirmada</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>Orden #{order.id.slice(0, 8)}</p>
        </div>
        <Link href="/market"
          className="inline-flex px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer shrink-0"
          style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
          Seguir comprando
        </Link>
      </div>

      {/* STATS */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl p-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Fecha</p>
          <p className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{fmtDate(order.created_at)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Total</p>
          <p className="font-black text-lg" style={{ color: "var(--nomi-navy)" }}>{money(total)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Cuotas</p>
          <p className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{order.installments} x {money(order.installment_amount)}</p>
        </div>
        <div className="bg-white rounded-2xl p-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-xs mb-1" style={{ color: "var(--nomi-muted)" }}>Estado</p>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full" style={{ backgroundColor: sc.bg, color: sc.color }}>{sc.label}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        {/* PRODUCTOS */}
        <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Productos</h2>
          <div className="space-y-3">
            {items.map((it) => {
              const p = it.product_id ? productsById[it.product_id] : null;
              const lineTotal = Number(it.price_snapshot || 0) * Number(it.qty || 0);
              return (
                <div key={it.id} className="flex items-center gap-3 p-3 rounded-xl"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                  <img src={getThumb(p)} alt={it.name_snapshot}
                    className="w-14 h-14 rounded-xl object-cover shrink-0"
                    style={{ border: "1px solid var(--nomi-border)" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
                  <div className="flex-1 min-w-0">
                    <p className="font-bold text-sm truncate" style={{ color: "var(--nomi-navy)" }}>{it.name_snapshot}</p>
                    <p className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{money(it.price_snapshot)} · Cant: {it.qty}</p>
                  </div>
                  <p className="font-black text-sm shrink-0" style={{ color: "var(--nomi-navy)" }}>{money(lineTotal)}</p>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between pt-3" style={{ borderTop: "1.5px solid var(--nomi-border)" }}>
            <span className="font-bold text-sm" style={{ color: "var(--nomi-muted)" }}>Total</span>
            <span className="font-black text-lg" style={{ color: "var(--nomi-navy)" }}>{money(total)}</span>
          </div>
        </div>

        {/* ENVIO + CUOTAS */}
        <div className="space-y-5">

          {/* ENVIO */}
          <div className="bg-white rounded-2xl p-5 space-y-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Informacion de envio</h2>
            <div className="space-y-2 text-sm">
              {[
                { label: "Nombre", value: order.shipping_name },
                { label: "Telefono", value: order.shipping_phone },
                { label: "Direccion", value: order.shipping_address },
                { label: "Ciudad", value: `${order.shipping_city || "-"} / ${order.shipping_department || "-"}` },
                { label: "Notas", value: order.shipping_notes || "-" },
              ].map((row) => (
                <div key={row.label} className="flex gap-2">
                  <span className="font-bold shrink-0" style={{ color: "var(--nomi-navy)", width: "80px" }}>{row.label}:</span>
                  <span style={{ color: "var(--nomi-muted)" }}>{row.value || "-"}</span>
                </div>
              ))}
            </div>
          </div>

          {/* CUOTAS */}
          <div className="bg-white rounded-2xl p-5 space-y-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Calendario de cuotas</h2>
            {installments.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>No se genero el calendario aun.</p>
            ) : (
              <div className="space-y-2">
                {installments.map((c: any) => {
                  const isc = instStatusCfg[c.status] || { label: c.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
                  return (
                    <div key={c.installment_number} className="flex items-center justify-between px-3 py-2.5 rounded-xl"
                      style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                      <span className="text-sm font-semibold" style={{ color: "var(--nomi-navy)" }}>Cuota #{c.installment_number}</span>
                      <span className="text-xs" style={{ color: "var(--nomi-muted)" }}>{c.due_date}</span>
                      <span className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(c.amount)}</span>
                      <span className="text-xs font-bold px-2 py-0.5 rounded-full" style={{ backgroundColor: isc.bg, color: isc.color }}>{isc.label}</span>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>*Fechas basadas en la regla de nomina de tu empresa.</p>
          </div>
        </div>
      </div>

      {/* ACCIONES */}
      <div className="flex flex-col md:flex-row gap-3">
        <Link href="/employee/orders"
          className="flex-1 text-center py-3 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
          Ver mis ordenes
        </Link>
        <Link href="/market"
          className="flex-1 text-center py-3 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          Seguir comprando
        </Link>
      </div>
    </div>
  );
}
