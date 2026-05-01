"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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

function getFirstImage(product: any, fallback: string) {
  const url = product?.image_url;
  if (typeof url === "string" && url.trim()) return url.trim();

  const imgs = product?.images;
  if (Array.isArray(imgs) && imgs.length > 0) return String(imgs[0]);

  if (typeof imgs === "string" && imgs.trim()) {
    if (imgs.trim().startsWith("[")) {
      try {
        const parsed = JSON.parse(imgs);
        if (Array.isArray(parsed) && parsed.length > 0) return String(parsed[0]);
      } catch {}
    }
    const first = imgs.split(",")[0]?.trim();
    if (first) return first;
  }

  return fallback;
}

export default function BrandOrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [productsById, setProductsById] = useState<Record<string, any>>({});

  const [updating, setUpdating] = useState(false);

  const totalBrand = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.price_snapshot || 0) * Number(it.qty || 0), 0);
  }, [items]);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    // auth
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      router.push("/login");
      return;
    }

    // users -> brand_id
    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("role, brand_id")
      .eq("auth_id", user.id)
      .single();

    if (uErr || !u || u.role !== "BRAND_ADMIN" || !u.brand_id) {
      router.push("/login");
      return;
    }

    // Orden: SOLO si está PROCESSED (regla #2)
    const { data: o, error: oErr } = await supabase
      .from("orders")
      .select("id, created_at, status, brand_status, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_department, shipping_notes")
      .eq("id", id)
      .single();

    if (oErr || !o) {
      setErrorMsg(oErr?.message || "No se pudo cargar la orden.");
      setLoading(false);
      return;
    }

    if (o.status !== "PROCESSED") {
      setErrorMsg("Esta orden aún no está procesada para despacho.");
      setLoading(false);
      return;
    }

    setOrder(o);

    // productos de la marca
    const { data: prods, error: pErr } = await supabase
      .from("products")
      .select("id, image_url, images, name")
      .eq("brand_id", u.brand_id);

    if (pErr) {
      setErrorMsg("No se pudieron cargar productos de la marca: " + pErr.message);
      setLoading(false);
      return;
    }

    const productIds = (prods || []).map((p) => p.id);
    const map: Record<string, any> = {};
    for (const p of prods || []) map[p.id] = p;
    setProductsById(map);

    // items de esta orden SOLO de esta marca
    const { data: its, error: itErr } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, name_snapshot, price_snapshot, qty, created_at")
      .eq("order_id", id)
      .in("product_id", productIds)
      .order("created_at", { ascending: true });

    if (itErr) {
      setErrorMsg("No se pudieron cargar items de esta orden: " + itErr.message);
      setLoading(false);
      return;
    }

    setItems(its || []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(newStatus: "PENDING" | "DISPATCHED" | "DELIVERED") {
    setErrorMsg(null);
    setUpdating(true);

    const { error } = await supabase.rpc("brand_update_order_status", {
      p_order_id: id,
      p_brand_status: newStatus,
    });

    setUpdating(false);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    await load();
  }

  if (loading) return <div className="p-6 text-slate-300">Cargando orden...</div>;

  if (errorMsg) {
    return (
      <div className="p-6 space-y-4">
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
        <Link href="/brand/orders" className="text-emerald-400 font-semibold">
          ← Volver a órdenes
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Orden</h1>
          <p className="text-slate-400 text-sm">Alistamiento y despacho (solo tu marca)</p>
        </div>
        <Link href="/brand/orders" className="text-emerald-400 font-semibold">
          ← Volver
        </Link>
      </div>

      {/* Cabecera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-slate-400 text-xs">Fecha y hora</div>
          <div className="text-slate-100 font-semibold">{safeDateTime(order?.created_at)}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-slate-400 text-xs">Estado (Brand)</div>
          <div className="text-slate-100 font-semibold">{order?.brand_status}</div>
        </div>

        <div className="border border-slate-800 bg-slate-900 rounded-lg p-4">
          <div className="text-slate-400 text-xs">Total (tu marca)</div>
          <div className="text-emerald-300 text-xl font-bold">{money(totalBrand)}</div>
        </div>
      </div>

      {/* Acciones estado */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
        <h2 className="text-lg font-semibold">Actualizar estado</h2>
        <div className="flex flex-wrap gap-2">
          <button
            disabled={updating}
            onClick={() => updateStatus("PENDING")}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm disabled:opacity-60"
          >
            Pendiente
          </button>
          <button
            disabled={updating}
            onClick={() => updateStatus("DISPATCHED")}
            className="px-4 py-2 rounded bg-amber-500/20 border border-amber-500/30 hover:bg-amber-500/25 text-sm disabled:opacity-60"
          >
            Despachado
          </button>
          <button
            disabled={updating}
            onClick={() => updateStatus("DELIVERED")}
            className="px-4 py-2 rounded bg-emerald-500/15 border border-emerald-500/30 hover:bg-emerald-500/20 text-sm disabled:opacity-60"
          >
            Entregado
          </button>
        </div>
      </div>

      {/* Envío */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-2">
        <h2 className="text-lg font-semibold">Dirección de envío</h2>
        <div className="text-sm text-slate-300">
          <div><b>Nombre:</b> {order?.shipping_name || "—"}</div>
          <div><b>Teléfono:</b> {order?.shipping_phone || "—"}</div>
          <div><b>Dirección:</b> {order?.shipping_address || "—"}</div>
          <div><b>Ciudad:</b> {order?.shipping_city || "—"}</div>
          <div><b>Departamento:</b> {order?.shipping_department || "—"}</div>
          <div><b>Notas:</b> {order?.shipping_notes || "—"}</div>
        </div>
      </div>

      {/* Items */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-4">
        <h2 className="text-lg font-semibold">Productos (tu marca)</h2>

        {items.length === 0 ? (
          <div className="text-slate-400 text-sm">
            Esta orden no contiene productos de tu marca (o no se pudieron filtrar).
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const p = it.product_id ? productsById[it.product_id] : null;
              const img = getFirstImage(p, "/no-image.png");
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
                    <div className="font-semibold text-slate-100 truncate">{it.name_snapshot}</div>
                    <div className="text-slate-400 text-sm">
                      {money(it.price_snapshot)} • Cant: {it.qty}
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-emerald-300 font-bold">{money(lineTotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="border-t border-slate-800 pt-4 flex items-center justify-between">
          <div className="text-slate-300">Total (tu marca)</div>
          <div className="text-emerald-300 text-xl font-bold">{money(totalBrand)}</div>
        </div>
      </div>
    </div>
  );
}