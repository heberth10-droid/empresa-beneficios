"use client";

import { useEffect, useMemo, useState } from "react";
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

function downloadCSV(filename: string, rows: Record<string, any>[]) {
  const headers = Object.keys(rows[0] || {});
  const escape = (v: any) => {
    const s = String(v ?? "");
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csv = [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export default function CompanyOrdersPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [orders, setOrders] = useState<any[]>([]);
  const [employeeNameById, setEmployeeNameById] = useState<Record<string, string>>({});
  const [firstDueByOrderId, setFirstDueByOrderId] = useState<Record<string, string>>({});

  // UI controls
  const [statusFilter, setStatusFilter] = useState<string>("ALL");
  const [q, setQ] = useState<string>("");

  // Modal state
  const [openOrderId, setOpenOrderId] = useState<string | null>(null);
  const [modalLoading, setModalLoading] = useState(false);
  const [modalError, setModalError] = useState<string | null>(null);
  const [modalItems, setModalItems] = useState<any[]>([]);
  const [updatingStatus, setUpdatingStatus] = useState(false);

  function getEmployeeNameByOrder(o: any) {
    return employeeNameById[o.employee_id] || "Empleado";
  }

  async function loadOrders(opts?: { silent?: boolean }) {
    const silent = opts?.silent ?? false;

    if (!silent) setLoading(true);
    setErrorMsg(null);

    // 1) Auth + role COMPANY_ADMIN + company_id
    const { data: u } = await supabase.auth.getUser();
    const user = u?.user;

    if (!user) {
      router.push("/login");
      return;
    }

    const { data: userRow, error: userErr } = await supabase
      .from("users")
      .select("role, company_id")
      .eq("auth_id", user.id)
      .single();

    if (userErr || !userRow || userRow.role !== "COMPANY_ADMIN" || !userRow.company_id) {
      router.push("/login");
      return;
    }

    const companyId = userRow.company_id;

    // 2) Orders
    const { data: ords, error: ordErr } = await supabase
      .from("orders")
      .select(
        "id, created_at, status, subtotal, installments, installment_amount, document_type, document_number, employee_id"
      )
      .eq("company_id", companyId)
      .order("created_at", { ascending: false });

    if (ordErr) {
      setErrorMsg("No se pudieron cargar las órdenes: " + ordErr.message);
      if (!silent) setLoading(false);
      return;
    }

    const safeOrders = ords || [];
    setOrders(safeOrders);

    // 3) Employees -> map id => employees.name
    const empIds = Array.from(new Set(safeOrders.map((o: any) => o.employee_id).filter(Boolean)));
    if (empIds.length > 0) {
      const { data: emps, error: empErr } = await supabase
        .from("employees")
        .select("id, name, email")
        .in("id", empIds);

      if (!empErr) {
        const map: Record<string, string> = {};
        for (const e of emps || []) {
          map[e.id] = String(e.name || e.email || "Empleado");
        }
        setEmployeeNameById(map);
      } else {
        console.warn("No se pudieron cargar empleados:", empErr.message);
        setEmployeeNameById({});
      }
    } else {
      setEmployeeNameById({});
    }

    // 4) Primera cuota (installment_number = 1)
    const orderIds = safeOrders.map((o: any) => o.id);
    if (orderIds.length > 0) {
      const { data: inst, error: instErr } = await supabase
        .from("order_installments")
        .select("order_id, due_date")
        .in("order_id", orderIds)
        .eq("installment_number", 1);

      if (!instErr) {
        const map: Record<string, string> = {};
        for (const row of inst || []) {
          map[row.order_id] = row.due_date;
        }
        setFirstDueByOrderId(map);
      } else {
        console.warn("No se pudieron cargar primeras cuotas:", instErr.message);
      }
    } else {
      setFirstDueByOrderId({});
    }

    if (!silent) setLoading(false);
  }

  useEffect(() => {
    loadOrders();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const statusOptions = useMemo(() => {
    return [
      { value: "ALL", label: "Todos" },
      { value: "CONFIRMED", label: "Confirmed" },
      { value: "PROCESSED", label: "Processed" },
      { value: "CANCELLED", label: "Cancelled" },
    ];
  }, []);

  const filtered = useMemo(() => {
    const qx = q.trim().toLowerCase();

    return orders.filter((o) => {
      const matchesStatus =
        statusFilter === "ALL" ? true : String(o.status).toUpperCase() === statusFilter;

      if (!matchesStatus) return false;
      if (!qx) return true;

      const empName = employeeNameById[o.employee_id] || "";

      const hay = [
        empName,
        o.document_type,
        o.document_number,
        o.status,
        o.id,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return hay.includes(qx);
    });
  }, [orders, q, statusFilter, employeeNameById]);

  async function handleRefresh() {
    setRefreshing(true);
    await loadOrders({ silent: true });
    setRefreshing(false);
  }

  function handleExport() {
    if (filtered.length === 0) return;

    const rows = filtered.map((o) => ({
      employee_name: employeeNameById[o.employee_id] || "",
      document_type: o.document_type,
      document_number: o.document_number,
      order_id: o.id,
      created_at: o.created_at,
      status: o.status,
      subtotal: o.subtotal,
      installments: o.installments,
      installment_amount: o.installment_amount,
      first_due_date: firstDueByOrderId[o.id] || "",
    }));

    downloadCSV(`company-orders-${new Date().toISOString().slice(0, 10)}.csv`, rows);
  }

  const openOrder = useMemo(() => {
    if (!openOrderId) return null;
    return orders.find((o) => o.id === openOrderId) || null;
  }, [openOrderId, orders]);

  async function loadOrderItems(orderId: string) {
    setModalLoading(true);
    setModalError(null);
    setModalItems([]);

    // Queremos: order_items + miniatura (si hay product.image_url o product.images)
    const { data, error } = await supabase
      .from("order_items")
      .select("id, name_snapshot, price_snapshot, qty, product_id")
      .eq("order_id", orderId);

    if (error) {
      setModalError("No se pudieron cargar los ítems: " + error.message);
      setModalLoading(false);
      return;
    }

    const items = data || [];
    const productIds = Array.from(new Set(items.map((it: any) => it.product_id).filter(Boolean)));

    let imgByProductId: Record<string, string> = {};
    if (productIds.length > 0) {
      const { data: prods, error: prodErr } = await supabase
        .from("products")
        .select("id, image_url, images")
        .in("id", productIds);

      if (!prodErr) {
        for (const p of prods || []) {
          let img = p.image_url || "";
          // images puede ser array o string con comas dependiendo de tu historia
          if (!img && p.images) {
            if (Array.isArray(p.images)) img = p.images[0] || "";
            else if (typeof p.images === "string") img = p.images.split(",")[0]?.trim() || "";
          }
          if (img) imgByProductId[p.id] = img;
        }
      }
    }

    const withImgs = items.map((it: any) => ({
      ...it,
      image: imgByProductId[it.product_id] || "",
    }));

    setModalItems(withImgs);
    setModalLoading(false);
  }

  async function handleOpenModal(orderId: string) {
    setOpenOrderId(orderId);
    await loadOrderItems(orderId);
  }

  function closeModal() {
    setOpenOrderId(null);
    setModalItems([]);
    setModalError(null);
    setModalLoading(false);
  }

  async function updateOrderStatus(orderId: string, status: "CONFIRMED" | "PROCESSED" | "CANCELLED") {
    setUpdatingStatus(true);

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      setModalError("No se pudo actualizar el estado: " + error.message);
      setUpdatingStatus(false);
      return;
    }

    // refrescar lista y mantener modal abierto
    await loadOrders({ silent: true });

    setUpdatingStatus(false);
  }

  if (loading) return <div className="p-6 text-slate-300">Cargando órdenes...</div>;

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
    <div className="space-y-5">
      {/* HEADER */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold">Órdenes</h1>
          <p className="text-slate-400 text-sm">
            Mostrando <b className="text-slate-200">{filtered.length}</b> de{" "}
            <b className="text-slate-200">{orders.length}</b>
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={handleExport}
            disabled={filtered.length === 0}
            className="px-4 py-2 rounded border border-slate-700 text-slate-200 hover:bg-slate-900 transition disabled:opacity-50"
          >
            Exportar CSV
          </button>

          <button
            onClick={handleRefresh}
            disabled={refreshing}
            className="px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 transition disabled:opacity-60"
          >
            {refreshing ? "Actualizando..." : "Refrescar"}
          </button>
        </div>
      </div>

      {/* CONTROLES */}
      <div className="flex flex-col md:flex-row gap-3">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm"
        >
          {statusOptions.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </select>

        <input
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por nombre, documento, estado, id..."
          className="flex-1 bg-slate-900 border border-slate-800 rounded px-3 py-2 text-sm"
        />
      </div>

      {/* LISTADO */}
      {filtered.length === 0 ? (
        <div className="border border-slate-800 bg-slate-900 rounded-lg p-6 text-slate-300">
          No hay órdenes con esos filtros.
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((o) => {
            const empName = employeeNameById[o.employee_id] || "Empleado";

            return (
              <button
                key={o.id}
                onClick={() => handleOpenModal(o.id)}
                className="w-full text-left border border-slate-800 bg-slate-900 rounded-lg p-4 flex flex-col gap-3 hover:border-emerald-500 transition"
              >
                {/* Nombre • Documento / Orden + Fecha */}
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                  <div className="min-w-0">
                    <div className="font-semibold truncate">
                      {empName} <span className="text-slate-500">•</span>{" "}
                      <span className="text-slate-200">
                        {o.document_type}-{o.document_number}
                      </span>
                    </div>

                    <div className="text-xs text-slate-400">
                      Orden #{o.id} • {fmtDateTime(o.created_at)}
                    </div>
                  </div>

                  <div className="flex items-center gap-3 text-sm">
                    <div className="px-2 py-1 rounded border border-slate-700 text-slate-200">
                      {o.status}
                    </div>
                  </div>
                </div>

                {/* Métricas */}
                <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-sm">
                  <div>
                    <div className="text-xs text-slate-400">Total</div>
                    <div className="font-semibold text-emerald-300">{money(o.subtotal)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Cuotas</div>
                    <div className="font-semibold">{o.installments}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Valor/cuota</div>
                    <div className="font-semibold">{money(o.installment_amount)}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">1ra cuota</div>
                    <div className="font-semibold">{firstDueByOrderId[o.id] || "—"}</div>
                  </div>

                  <div>
                    <div className="text-xs text-slate-400">Monto (para nómina)</div>
                    <div className="font-semibold text-slate-200">
                      {money(o.installment_amount)} / periodo
                    </div>
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      )}

      {/* MODAL */}
      {openOrder && (
        <div
          className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4"
          onClick={closeModal}
        >
          <div
            className="w-full max-w-3xl bg-slate-950 border border-slate-800 rounded-xl overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header modal */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-800">
              <div className="font-bold">
                Orden #{openOrder.id}
              </div>

              <button
                onClick={closeModal}
                className="text-slate-300 hover:text-white text-xl leading-none"
                aria-label="Cerrar"
              >
                ×
              </button>
            </div>

            <div className="p-5 space-y-5">
              {modalError && (
                <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
                  {modalError}
                </div>
              )}

              {/* 4 cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
                <div className="border border-slate-800 bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Empleado</div>
                  <div className="font-semibold">
                    {getEmployeeNameByOrder(openOrder)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {openOrder.document_type}-{openOrder.document_number}
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Total</div>
                  <div className="text-emerald-300 text-lg font-bold">
                    {money(openOrder.subtotal)}
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-400">Valor cuota</div>
                  <div className="font-semibold">
                    {money(openOrder.installment_amount)}
                  </div>
                  <div className="text-xs text-slate-400 mt-1">
                    {openOrder.installments} cuotas
                  </div>
                </div>

                <div className="border border-slate-800 bg-slate-900 rounded-lg p-3">
                  <div className="text-xs text-slate-400">1ra cuota</div>
                  <div className="font-semibold">
                    {firstDueByOrderId[openOrder.id] || "—"}
                  </div>
                </div>
              </div>

              {/* Items */}
              <div className="space-y-2">
                <div className="font-semibold">Ítems comprados</div>

                {modalLoading ? (
                  <div className="text-slate-300 text-sm">Cargando ítems...</div>
                ) : modalItems.length === 0 ? (
                  <div className="text-slate-400 text-sm">No hay ítems para esta orden.</div>
                ) : (
                  <div className="space-y-2">
                    {modalItems.map((it: any) => {
                      const img = it.image || "/no-image.png";
                      const lineTotal = Number(it.price_snapshot || 0) * Number(it.qty || 0);

                      return (
                        <div
                          key={it.id}
                          className="flex items-center gap-3 border border-slate-800 bg-slate-900 rounded-lg p-3"
                        >
                          <img
                            src={img}
                            alt={it.name_snapshot}
                            className="w-12 h-12 rounded border border-slate-800 object-cover"
                            onError={(e) => {
                              (e.currentTarget as HTMLImageElement).src = "/no-image.png";
                            }}
                          />

                          <div className="flex-1 min-w-0">
                            <div className="font-semibold truncate">{it.name_snapshot}</div>
                            <div className="text-xs text-slate-400">
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
                )}
              </div>

              {/* Botones de estado */}
              <div className="flex flex-col md:flex-row gap-2 md:justify-end">
                <button
                  disabled={updatingStatus}
                  onClick={() => updateOrderStatus(openOrder.id, "CONFIRMED")}
                  className="px-4 py-2 rounded bg-blue-500/90 hover:bg-blue-400 text-slate-950 font-bold transition disabled:opacity-60"
                >
                  Confirmar
                </button>

                <button
                  disabled={updatingStatus}
                  onClick={() => updateOrderStatus(openOrder.id, "PROCESSED")}
                  className="px-4 py-2 rounded bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold transition disabled:opacity-60"
                >
                  Procesar
                </button>

                <button
                  disabled={updatingStatus}
                  onClick={() => updateOrderStatus(openOrder.id, "CANCELLED")}
                  className="px-4 py-2 rounded bg-red-500 hover:bg-red-400 text-slate-950 font-bold transition disabled:opacity-60"
                >
                  Cancelar
                </button>
              </div>

              <div className="text-xs text-slate-500">
                Creada: {fmtDateTime(openOrder.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}