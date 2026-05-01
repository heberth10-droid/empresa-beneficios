"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
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

function toCsv(rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };
  const lines = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ];
  return lines.join("\n");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function BrandOrdersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [brandId, setBrandId] = useState<string | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, any[]>>({});

  // filtros
  const [statusFilter, setStatusFilter] = useState<"ALL" | "PENDING" | "DISPATCHED" | "DELIVERED">("ALL");
  const [fromDate, setFromDate] = useState<string>(""); // YYYY-MM-DD
  const [toDate, setToDate] = useState<string>("");   // YYYY-MM-DD

  const totalsByOrder = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.id] = 0;

    for (const [orderId, items] of Object.entries(itemsByOrder)) {
      map[orderId] = (items || []).reduce(
        (acc, it) => acc + Number(it.price_snapshot || 0) * Number(it.qty || 0),
        0
      );
    }
    return map;
  }, [orders, itemsByOrder]);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    // 1) auth
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) {
      router.push("/login");
      return;
    }

    // 2) brand_id desde users
    const { data: u, error: uErr } = await supabase
      .from("users")
      .select("role, brand_id")
      .eq("auth_id", user.id)
      .single();

    if (uErr || !u || u.role !== "BRAND_ADMIN" || !u.brand_id) {
      router.push("/login");
      return;
    }
    setBrandId(u.brand_id);

    // 3) ids de productos de la marca
    const { data: brandProducts, error: pErr } = await supabase
      .from("products")
      .select("id")
      .eq("brand_id", u.brand_id);

    if (pErr) {
      setErrorMsg("No se pudieron cargar productos de la marca: " + pErr.message);
      setLoading(false);
      return;
    }

    const productIds = (brandProducts || []).map((p) => p.id);
    if (productIds.length === 0) {
      setOrders([]);
      setItemsByOrder({});
      setLoading(false);
      return;
    }

    // 4) order_items de esa marca
    const { data: oItems, error: oiErr } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, name_snapshot, price_snapshot, qty, created_at")
      .in("product_id", productIds)
      .order("created_at", { ascending: false });

    if (oiErr) {
      setErrorMsg("No se pudieron cargar items vendidos: " + oiErr.message);
      setLoading(false);
      return;
    }

    const items = oItems || [];
    const uniqueOrderIds = Array.from(new Set(items.map((it) => it.order_id)));

    if (uniqueOrderIds.length === 0) {
      setOrders([]);
      setItemsByOrder({});
      setLoading(false);
      return;
    }

    // 5) traer órdenes (SOLO PROCESSED) + filtros
    let q = supabase
      .from("orders")
      .select("id, created_at, status, brand_status, shipping_city, shipping_department")
      .in("id", uniqueOrderIds)
      .eq("status", "PROCESSED")
      .order("created_at", { ascending: false });

    if (statusFilter !== "ALL") q = q.eq("brand_status", statusFilter);
    if (fromDate) q = q.gte("created_at", fromDate + "T00:00:00");
    if (toDate) q = q.lte("created_at", toDate + "T23:59:59");

    const { data: ords, error: oErr } = await q;

    if (oErr) {
      setErrorMsg("No se pudieron cargar las órdenes: " + oErr.message);
      setLoading(false);
      return;
    }

    // Agrupar items por order pero SOLO los que están en ords filtradas
    const allowed = new Set((ords || []).map((o) => o.id));
    const grouped: Record<string, any[]> = {};
    for (const it of items) {
      if (!allowed.has(it.order_id)) continue;
      if (!grouped[it.order_id]) grouped[it.order_id] = [];
      grouped[it.order_id].push(it);
    }

    setOrders(ords || []);
    setItemsByOrder(grouped);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // recargar cuando cambian filtros
  useEffect(() => {
    if (!brandId) return;
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, fromDate, toDate]);

  function handleDownloadCsv() {
    const rows: Record<string, any>[] = [];

    for (const o of orders) {
      const its = itemsByOrder[o.id] || [];
      for (const it of its) {
        rows.push({
          order_id: o.id,
          order_created_at: o.created_at,
          order_status: o.status,
          brand_status: o.brand_status,
          shipping_city: o.shipping_city ?? "",
          shipping_department: o.shipping_department ?? "",
          product_name: it.name_snapshot,
          qty: it.qty,
          unit_price: it.price_snapshot,
          line_total: Number(it.price_snapshot || 0) * Number(it.qty || 0),
        });
      }
    }

    const csv = toCsv(rows.length ? rows : [{ info: "No hay datos" }]);
    downloadTextFile(`brand-orders-${new Date().toISOString().slice(0, 10)}.csv`, csv);
  }

  if (loading) return <div className="p-6 text-slate-300">Cargando órdenes de la marca...</div>;

  if (errorMsg) {
    return (
      <div className="p-6">
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Órdenes</h1>
          <p className="text-slate-400 text-sm">
            Solo aparecen órdenes <b>PROCESSED</b> (confirmadas para despacho).
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleDownloadCsv}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm"
          >
            Descargar CSV
          </button>
        </div>
      </div>

      {/* filtros */}
      <div className="border border-slate-800 bg-slate-900 rounded-lg p-4 grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="space-y-1">
          <div className="text-xs text-slate-400">Estado (Brand)</div>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
          >
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="DISPATCHED">Despachado</option>
            <option value="DELIVERED">Entregado</option>
          </select>
        </div>

        <div className="space-y-1">
          <div className="text-xs text-slate-400">Desde</div>
          <input
            type="date"
            value={fromDate}
            onChange={(e) => setFromDate(e.target.value)}
            className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="space-y-1">
          <div className="text-xs text-slate-400">Hasta</div>
          <input
            type="date"
            value={toDate}
            onChange={(e) => setToDate(e.target.value)}
            className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
          />
        </div>

        <div className="flex items-end">
          <button
            onClick={() => {
              setStatusFilter("ALL");
              setFromDate("");
              setToDate("");
            }}
            className="w-full px-4 py-2 rounded border border-slate-700 hover:bg-slate-900 text-sm"
          >
            Limpiar
          </button>
        </div>
      </div>

      {orders.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-6 text-slate-300">
          No hay órdenes con esos filtros.
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const its = itemsByOrder[o.id] || [];
            const totalBrand = totalsByOrder[o.id] || 0;

            return (
              <Link
                key={o.id}
                href={`/brand/orders/${o.id}`}
                className="block border border-slate-800 bg-slate-900 rounded-lg p-4 hover:border-emerald-500 transition"
              >
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                  <div className="space-y-1">
                    <div className="text-slate-400 text-xs">Fecha</div>
                    <div className="text-slate-100 font-semibold">{safeDateTime(o.created_at)}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 text-xs">Estado (Brand)</div>
                    <div className="text-slate-100 font-semibold">{o.brand_status}</div>
                  </div>

                  <div className="space-y-1">
                    <div className="text-slate-400 text-xs">Items</div>
                    <div className="text-slate-100 font-semibold">{its.length}</div>
                  </div>

                  <div className="space-y-1 text-right">
                    <div className="text-slate-400 text-xs">Total (tu marca)</div>
                    <div className="text-emerald-300 font-bold text-lg">{money(totalBrand)}</div>
                  </div>
                </div>

                <div className="mt-3 text-xs text-slate-500">
                  Envío: {o.shipping_city ?? "—"}, {o.shipping_department ?? "—"}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}