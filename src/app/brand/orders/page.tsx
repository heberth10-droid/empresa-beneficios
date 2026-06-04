"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Download, Filter } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

function safeDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString("es-CO"); } catch { return String(iso); }
}

function toCsv(rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) return `"${s.replace(/"/g, '""')}"`;
    return s;
  };
  return [headers.join(","), ...rows.map((r) => headers.map((h) => escape(r[h])).join(","))].join("\n");
}

function downloadTextFile(filename: string, content: string) {
  const blob = new Blob([content], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = filename; a.click();
  URL.revokeObjectURL(url);
}

const statusColors: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
  DISPATCHED: { label: "Despachado", color: "#2563EB",            bg: "#DBEAFE" },
  DELIVERED:  { label: "Entregado",  color: "#16A34A",            bg: "#DCFCE7" },
  CONFIRMED:  { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
  PROCESSED:  { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
};

export default function BrandOrdersPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [brandId, setBrandId] = useState<string | null>(null);
  const [orders, setOrders] = useState<any[]>([]);
  const [itemsByOrder, setItemsByOrder] = useState<Record<string, any[]>>({});
  const [statusFilter, setStatusFilter] = useState<"ALL"|"PENDING"|"DISPATCHED"|"DELIVERED">("ALL");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");

  const totalsByOrder = useMemo(() => {
    const map: Record<string, number> = {};
    for (const o of orders) map[o.id] = 0;
    for (const [orderId, items] of Object.entries(itemsByOrder)) {
      map[orderId] = (items || []).reduce((acc, it) => acc + Number(it.price_snapshot || 0) * Number(it.qty || 0), 0);
    }
    return map;
  }, [orders, itemsByOrder]);

  async function load() {
    setLoading(true); setErrorMsg(null);
    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) { router.push("/login"); return; }

    const { data: u, error: uErr } = await supabase.from("users").select("role, brand_id").eq("auth_id", user.id).single();
    if (uErr || !u || u.role !== "BRAND_ADMIN" || !u.brand_id) { router.push("/login"); return; }
    setBrandId(u.brand_id);

    const { data: brandProducts, error: pErr } = await supabase.from("products").select("id").eq("brand_id", u.brand_id);
    if (pErr) { setErrorMsg("No se pudieron cargar productos: " + pErr.message); setLoading(false); return; }

    const productIds = (brandProducts || []).map((p: any) => p.id);
    if (productIds.length === 0) { setOrders([]); setItemsByOrder({}); setLoading(false); return; }

    const { data: oItems, error: oiErr } = await supabase
      .from("order_items").select("id, order_id, product_id, name_snapshot, price_snapshot, qty, created_at")
      .in("product_id", productIds).order("created_at", { ascending: false });
    if (oiErr) { setErrorMsg("No se pudieron cargar items: " + oiErr.message); setLoading(false); return; }

    const items = oItems || [];
    const uniqueOrderIds = Array.from(new Set(items.map((it: any) => it.order_id)));
    if (uniqueOrderIds.length === 0) { setOrders([]); setItemsByOrder({}); setLoading(false); return; }

    let q = supabase.from("orders")
      .select("id, created_at, status, brand_status, shipping_city, shipping_department")
      .in("id", uniqueOrderIds).in("status", ["CONFIRMED", "PROCESSED"])
      .order("created_at", { ascending: false });
    if (statusFilter !== "ALL") q = q.eq("brand_status", statusFilter);
    if (fromDate) q = q.gte("created_at", fromDate + "T00:00:00");
    if (toDate) q = q.lte("created_at", toDate + "T23:59:59");

    const { data: ords, error: oErr } = await q;
    if (oErr) { setErrorMsg("No se pudieron cargar ordenes: " + oErr.message); setLoading(false); return; }

    const allowed = new Set((ords || []).map((o: any) => o.id));
    const grouped: Record<string, any[]> = {};
    for (const it of items) {
      if (!allowed.has((it as any).order_id)) continue;
      if (!grouped[(it as any).order_id]) grouped[(it as any).order_id] = [];
      grouped[(it as any).order_id].push(it);
    }
    setOrders(ords || []); setItemsByOrder(grouped); setLoading(false);
  }

  useEffect(() => { load(); }, []);
  useEffect(() => { if (!brandId) return; load(); }, [statusFilter, fromDate, toDate]);

  function handleDownloadCsv() {
    const rows: Record<string, any>[] = [];
    for (const o of orders) {
      for (const it of itemsByOrder[o.id] || []) {
        rows.push({
          order_id: o.id, order_created_at: o.created_at, order_status: o.status,
          brand_status: o.brand_status, shipping_city: o.shipping_city ?? "",
          product_name: it.name_snapshot, qty: it.qty, unit_price: it.price_snapshot,
          line_total: Number(it.price_snapshot || 0) * Number(it.qty || 0),
        });
      }
    }
    downloadTextFile(`brand-orders-${new Date().toISOString().slice(0, 10)}.csv`, toCsv(rows.length ? rows : [{ info: "No hay datos" }]));
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (errorMsg) return (
    <div className="px-4 py-3 rounded-xl text-sm font-semibold"
      style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{errorMsg}</div>
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>Gestion</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Ordenes</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            {orders.length} orden{orders.length !== 1 ? "es" : ""} · solo CONFIRMED y PROCESSED
          </p>
        </div>
        <button onClick={handleDownloadCsv}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
          <Download className="w-4 h-4" /> Descargar CSV
        </button>
      </div>

      {/* FILTROS */}
      <div className="bg-white rounded-2xl p-4 grid grid-cols-2 md:grid-cols-4 gap-3"
        style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--nomi-navy)" }}>Estado</label>
          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value as any)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none cursor-pointer"
            style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }}>
            <option value="ALL">Todos</option>
            <option value="PENDING">Pendiente</option>
            <option value="DISPATCHED">Despachado</option>
            <option value="DELIVERED">Entregado</option>
          </select>
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--nomi-navy)" }}>Desde</label>
          <input type="date" value={fromDate} onChange={(e) => setFromDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }} />
        </div>
        <div>
          <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
            style={{ color: "var(--nomi-navy)" }}>Hasta</label>
          <input type="date" value={toDate} onChange={(e) => setToDate(e.target.value)}
            className="w-full px-3 py-2 rounded-xl text-sm outline-none"
            style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }} />
        </div>
        <div className="flex items-end">
          <button onClick={() => { setStatusFilter("ALL"); setFromDate(""); setToDate(""); }}
            className="w-full px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
            Limpiar
          </button>
        </div>
      </div>

      {/* LISTA */}
      {orders.length === 0 ? (
        <div className="bg-white rounded-2xl px-5 py-10 text-center"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>
            No hay ordenes con esos filtros
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {orders.map((o) => {
            const its = itemsByOrder[o.id] || [];
            const totalBrand = totalsByOrder[o.id] || 0;
            const st = statusColors[o.brand_status || o.status] || { label: o.brand_status || o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
            return (
              <Link key={o.id} href={`/brand/orders/${o.id}`}
                className="block bg-white rounded-2xl p-5 transition hover:shadow-md"
                style={{ border: "1.5px solid var(--nomi-border)" }}>
                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                      #{o.id.slice(0, 8)}
                    </div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                      {safeDateTime(o.created_at)} · {o.shipping_city ?? "—"}, {o.shipping_department ?? "—"}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>
                      {its.length} item{its.length !== 1 ? "s" : ""}
                    </span>
                    <span className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
                      {money(totalBrand)}
                    </span>
                  </div>
                </div>
                {its.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {its.slice(0, 3).map((it) => (
                      <span key={it.id} className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)" }}>
                        {it.name_snapshot} × {it.qty}
                      </span>
                    ))}
                    {its.length > 3 && (
                      <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
                        style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" }}>
                        +{its.length - 3} más
                      </span>
                    )}
                  </div>
                )}
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
