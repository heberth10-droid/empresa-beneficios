"use client";

import { useEffect, useMemo, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { ShoppingCart, X } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
  PENDING:    { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
  CONFIRMED:  { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
  PROCESSED:  { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
  PROCESSING: { label: "En proceso", color: "#8B5CF6",            bg: "#EDE9FE" },
  SHIPPED:    { label: "Enviada",    color: "#2563EB",            bg: "#DBEAFE" },
  DISPATCHED: { label: "Despachada", color: "#2563EB",            bg: "#DBEAFE" },
  DELIVERED:  { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
  CANCELLED:  { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
};

export default function AdminOrdersPage() {
  const [rows, setRows] = useState<any[]>([]);
  const [empMap, setEmpMap] = useState<Record<string, any>>({});
  const [compMap, setCompMap] = useState<Record<string, string>>({});
  const [filter, setFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [dbError, setDbError] = useState<string | null>(null);
  const [selected, setSelected] = useState<any | null>(null);
  const [orderItems, setOrderItems] = useState<any[]>([]);
  const [loadingItems, setLoadingItems] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setDbError(null);
      const { data: orders, error } = await supabase
        .from("orders")
        .select("id, created_at, status, subtotal, installments, installment_amount, employee_id, company_id, shipping_name, shipping_phone, shipping_address, shipping_city, shipping_department, document_type, document_number")
        .order("created_at", { ascending: false });

      if (error) {
        setDbError("Error al cargar ordenes: " + error.message);
        setLoading(false);
        return;
      }

      const empIds = [...new Set((orders || []).map((o: any) => o.employee_id).filter(Boolean))];
      const compIds = [...new Set((orders || []).map((o: any) => o.company_id).filter(Boolean))];

      let em: Record<string, any> = {};
      let cm: Record<string, string> = {};

      if (empIds.length > 0) {
        const { data: emps } = await supabase
          .from("employees").select("id, name, email, document_type, document_number").in("id", empIds);
        for (const e of emps || []) em[e.id] = e;
      }
      if (compIds.length > 0) {
        const { data: comps } = await supabase
          .from("companies").select("id, name").in("id", compIds);
        for (const c of comps || []) cm[c.id] = c.name || c.id;
      }

      setRows(orders || []);
      setEmpMap(em);
      setCompMap(cm);
      setLoading(false);
    }
    load();
  }, []);

  async function openOrder(o: any) {
    setSelected(o);
    setOrderItems([]);
    setItemsError(null);
    setLoadingItems(true);
    const { data, error } = await supabase
      .from("order_items")
      .select("id, name_snapshot, qty, unit_price, price_snapshot, product_id")
      .eq("order_id", o.id);
    setLoadingItems(false);
    if (error) {
      setItemsError("Error cargando items: " + error.message);
    } else {
      setOrderItems(data || []);
    }
  }

  const filtered = useMemo(() =>
    filter === "ALL" ? rows : rows.filter((r) => r.status === filter),
    [rows, filter]
  );

  const statuses = ["ALL", "PENDING", "CONFIRMED", "PROCESSED", "DISPATCHED", "DELIVERED", "CANCELLED"];

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Ordenes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {loading ? "Cargando..." : `${filtered.length} orden${filtered.length !== 1 ? "es" : ""} · clic para ver detalle`}
        </p>
      </div>

      {dbError && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#FEE2E2", color: "#DC2626", border: "1px solid #FECACA" }}>
          {dbError}
        </div>
      )}

      <div className="flex gap-2 flex-wrap">
        {statuses.map((s) => {
          const cfg = statusConfig[s];
          return (
            <button key={s} onClick={() => setFilter(s)}
              className="px-3 py-1.5 rounded-full text-xs font-bold cursor-pointer transition"
              style={filter === s
                ? { backgroundColor: "var(--nomi-navy)", color: "#fff" }
                : { backgroundColor: "#fff", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
              {s === "ALL" ? "Todas" : cfg?.label || s}
            </button>
          );
        })}
      </div>

      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>

        <div className="grid grid-cols-6 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span>Orden</span>
          <span className="col-span-2">Empleado</span>
          <span>Empresa</span>
          <span>Estado</span>
          <span className="text-right">Total</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : filtered.length === 0 && !dbError ? (
          <div className="px-5 py-12 text-center">
            <ShoppingCart className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
            <p className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>No hay ordenes</p>
          </div>
        ) : filtered.map((o) => {
          const st = statusConfig[o.status] || { label: o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
          const emp = empMap[o.employee_id];
          return (
            <div key={o.id}
              className="grid grid-cols-6 px-5 py-3.5 items-center text-sm transition hover:bg-slate-50 cursor-pointer"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}
              onClick={() => openOrder(o)}>
              <div>
                <div className="font-bold text-xs" style={{ color: "var(--nomi-navy)" }}>
                  #{o.id.slice(0, 8)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  {new Date(o.created_at).toLocaleDateString("es-CO")}
                </div>
              </div>
              <div className="col-span-2 font-semibold truncate pr-2" style={{ color: "var(--nomi-navy)" }}>
                {emp?.name || o.shipping_name || o.document_number || "—"}
              </div>
              <div className="truncate pr-2 text-sm" style={{ color: "var(--nomi-muted)" }}>
                {compMap[o.company_id] || "—"}
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: st.bg, color: st.color }}>
                  {st.label}
                </span>
              </div>
              <div className="text-right font-black" style={{ color: "var(--nomi-navy)" }}>
                {money(o.subtotal)}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL DETALLE */}
      {selected && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setSelected(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ border: "1.5px solid var(--nomi-border)" }}
            onClick={(e) => e.stopPropagation()}>

            {/* HEADER */}
            <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div>
                <div className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
                  Orden #{selected.id.slice(0, 8)}
                </div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                  {new Date(selected.created_at).toLocaleString("es-CO")}
                </div>
              </div>
              <div className="flex items-center gap-3">
                {(() => {
                  const st = statusConfig[selected.status] || { label: selected.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
                  return (
                    <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                      style={{ backgroundColor: st.bg, color: st.color }}>
                      {st.label}
                    </span>
                  );
                })()}
                <button onClick={() => setSelected(null)}
                  className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                  style={{ backgroundColor: "var(--nomi-gray)" }}>
                  <X className="w-4 h-4" style={{ color: "var(--nomi-muted)" }} />
                </button>
              </div>
            </div>

            <div className="px-6 py-5 space-y-6">

              {/* COMPRADOR */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2"
                  style={{ color: "var(--nomi-teal)" }}>Comprador</p>
                <div className="space-y-2">
                  {([
                    ["Empleado", empMap[selected.employee_id]?.name || selected.shipping_name || "—"],
                    ["Email", empMap[selected.employee_id]?.email || "—"],
                    ["Documento", `${selected.document_type || ""} ${selected.document_number || ""}`.trim() || "—"],
                    ["Empresa", compMap[selected.company_id] || "—"],
                  ] as [string,string][]).map(([l, v]) => (
                    <div key={l} className="flex justify-between text-sm">
                      <span style={{ color: "var(--nomi-muted)" }}>{l}</span>
                      <span className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* ENVIO */}
              {(selected.shipping_address || selected.shipping_city) && (
                <div>
                  <p className="text-xs font-bold uppercase tracking-wide mb-2"
                    style={{ color: "var(--nomi-teal)" }}>Envio</p>
                  <div className="space-y-2">
                    {([
                      ["Direccion", selected.shipping_address || "—"],
                      ["Ciudad", selected.shipping_city || "—"],
                      ["Departamento", selected.shipping_department || "—"],
                      ["Telefono", selected.shipping_phone || "—"],
                    ] as [string,string][]).map(([l, v]) => (
                      <div key={l} className="flex justify-between text-sm">
                        <span style={{ color: "var(--nomi-muted)" }}>{l}</span>
                        <span className="font-semibold" style={{ color: "var(--nomi-navy)" }}>{v}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PAGO */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-2"
                  style={{ color: "var(--nomi-teal)" }}>Pago</p>
                <div className="space-y-2">
                  {([
                    ["Total", money(selected.subtotal)],
                    ["Cuotas", String(selected.installments || "—")],
                    ["Valor cuota", selected.installment_amount ? money(selected.installment_amount) : "—"],
                  ] as [string,string][]).map(([l, v]) => (
                    <div key={l} className="flex justify-between text-sm">
                      <span style={{ color: "var(--nomi-muted)" }}>{l}</span>
                      <span className="font-black" style={{ color: "var(--nomi-navy)" }}>{v}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* PRODUCTOS COMPRADOS */}
              <div>
                <p className="text-xs font-bold uppercase tracking-wide mb-3"
                  style={{ color: "var(--nomi-teal)" }}>Productos comprados</p>

                {itemsError && (
                  <p className="text-xs font-semibold px-3 py-2 rounded-xl mb-2"
                    style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                    {itemsError}
                  </p>
                )}

                {loadingItems ? (
                  <div className="space-y-2">
                    {[1,2].map(i => (
                      <div key={i} className="h-14 rounded-xl animate-pulse"
                        style={{ backgroundColor: "var(--nomi-gray)" }} />
                    ))}
                  </div>
                ) : orderItems.length === 0 && !itemsError ? (
                  <div className="px-4 py-4 rounded-xl text-center text-sm"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" }}>
                    No se encontraron items en esta orden
                  </div>
                ) : (
                  <div className="space-y-2">
                    {orderItems.map((it) => {
                      const unitPrice = Number(it.unit_price || it.price_snapshot || 0);
                      const qty = Number(it.qty || 1);
                      return (
                        <div key={it.id}
                          className="flex items-center gap-3 px-4 py-3 rounded-xl"
                          style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                          <div className="flex-1 min-w-0">
                            <div className="font-semibold text-sm truncate" style={{ color: "var(--nomi-navy)" }}>
                              {it.name_snapshot || "Producto"}
                            </div>
                            <div className="text-xs mt-0.5 flex items-center gap-2"
                              style={{ color: "var(--nomi-muted)" }}>
                              <span>Cantidad: {qty}</span>
                              <span>·</span>
                              <span>Precio unit: {money(unitPrice)}</span>
                            </div>
                          </div>
                          <div className="font-black text-sm shrink-0" style={{ color: "var(--nomi-navy)" }}>
                            {money(unitPrice * qty)}
                          </div>
                        </div>
                      );
                    })}

                    {/* TOTAL ITEMS */}
                    <div className="flex justify-between items-center px-4 py-2 rounded-xl"
                      style={{ backgroundColor: "var(--nomi-navy)" }}>
                      <span className="text-xs font-bold text-white">Total orden</span>
                      <span className="font-black text-sm" style={{ color: "var(--nomi-orange)" }}>
                        {money(selected.subtotal)}
                      </span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
