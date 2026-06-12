"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Number(n || 0));
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

  async function updateOrderStatus(
    orderId: string,
    status: "CONFIRMED" | "PROCESSED" | "CANCELLED"
  ) {
    setUpdatingStatus(true);
    setModalError(null);

    const { error } = await supabase
      .from("orders")
      .update({ status })
      .eq("id", orderId);

    if (error) {
      setModalError("No se pudo actualizar el estado: " + error.message);
      setUpdatingStatus(false);
      return;
    }

    setOrders((prev) =>
      prev.map((o) => (o.id === orderId ? { ...o, status } : o))
    );

    await loadOrders({ silent: true });

    setUpdatingStatus(false);
    closeModal();
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (errorMsg && !orders.length) return (
    <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
      {errorMsg}
    </div>
  );

  const statusConfig: Record<string, { label: string; color: string; bg: string }> = {
    PENDING:    { label: "Pendiente",  color: "var(--nomi-orange)", bg: "var(--nomi-orange-bg)" },
    CONFIRMED:  { label: "Confirmada", color: "var(--nomi-teal)",   bg: "var(--nomi-teal-bg)" },
    PROCESSED:  { label: "Procesada",  color: "#8B5CF6",            bg: "#EDE9FE" },
    DISPATCHED: { label: "Despachada", color: "#2563EB",            bg: "#DBEAFE" },
    DELIVERED:  { label: "Entregada",  color: "#16A34A",            bg: "#DCFCE7" },
    CANCELLED:  { label: "Cancelada",  color: "#DC2626",            bg: "#FEE2E2" },
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Gestion</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Ordenes</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {loading ? "Cargando..." : `${filtered.length} de ${orders.length} ordenes`}
        </p>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {errorMsg}
        </div>
      )}

      {/* FILTROS */}
      <div className="bg-white rounded-2xl p-4 flex flex-col md:flex-row gap-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <input placeholder="Buscar empleado, estado..."
          value={q} onChange={(e) => setQ(e.target.value)}
          className="flex-1 px-4 py-2.5 rounded-xl text-sm outline-none"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}
          className="px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
          style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)" }}>
          <option value="ALL">Todos los estados</option>
          <option value="PENDING">Pendiente</option>
          <option value="CONFIRMED">Confirmada</option>
          <option value="PROCESSED">Procesada</option>
          <option value="DISPATCHED">Despachada</option>
          <option value="DELIVERED">Entregada</option>
          <option value="CANCELLED">Cancelada</option>
        </select>
        <div className="flex gap-2">
          <button onClick={() => loadOrders({ silent: true })} disabled={refreshing}
            className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
            {refreshing ? "..." : "Actualizar"}
          </button>
          <button onClick={handleExport}
            className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
            CSV
          </button>
        </div>
      </div>

      {/* TABLA */}
      <div className="bg-white rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="grid grid-cols-5 px-5 py-3 text-xs font-bold uppercase tracking-wide"
          style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", borderBottom: "1px solid var(--nomi-border)" }}>
          <span>Orden</span>
          <span className="col-span-2">Empleado</span>
          <span>Estado</span>
          <span className="text-right">Total</span>
        </div>

        {loading ? (
          <div className="p-5 space-y-3">
            {[1,2,3,4,5].map(i => <div key={i} className="h-12 rounded-xl animate-pulse" style={{ backgroundColor: "var(--nomi-gray)" }} />)}
          </div>
        ) : filtered.length === 0 ? (
          <div className="px-5 py-10 text-center text-sm" style={{ color: "var(--nomi-muted)" }}>
            No hay ordenes con esos filtros
          </div>
        ) : filtered.map((o) => {
          const st = statusConfig[o.status] || { label: o.status, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
          const firstDue = firstDueByOrderId[o.id];
          return (
            <div key={o.id}
              className="grid grid-cols-5 px-5 py-3.5 items-center transition hover:bg-slate-50 cursor-pointer"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}
              onClick={() => setOpenOrderId(o.id)}>
              <div>
                <div className="font-bold text-xs" style={{ color: "var(--nomi-navy)" }}>#{o.id.slice(0,8)}</div>
                <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>{fmtDateTime(o.created_at).split(",")[0]}</div>
              </div>
              <div className="col-span-2">
                <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{getEmployeeNameByOrder(o)}</div>
                {firstDue && <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>1a cuota: {firstDue}</div>}
              </div>
              <div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full"
                  style={{ backgroundColor: st.bg, color: st.color }}>{st.label}</span>
              </div>
              <div className="text-right font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                {money(o.subtotal)}
              </div>
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {openOrderId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.5)" }}
          onClick={() => setOpenOrderId(null)}>
          <div className="bg-white rounded-2xl w-full max-w-lg shadow-2xl max-h-[90vh] overflow-y-auto"
            style={{ border: "1.5px solid var(--nomi-border)" }}
            onClick={(e) => e.stopPropagation()}>

            <div className="flex items-center justify-between px-6 py-4 sticky top-0 bg-white z-10"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <div className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
                Orden #{openOrderId.slice(0,8)}
              </div>
              <button onClick={() => { setOpenOrderId(null); }}
                className="w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
                style={{ backgroundColor: "var(--nomi-gray)" }}>
                <span style={{ color: "var(--nomi-muted)" }}>✕</span>
              </button>
            </div>

            <div className="px-6 py-5 space-y-4">
              {modalLoading && (
                <div className="flex items-center justify-center py-8">
                  <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
                </div>
              )}
              {modalError && (
                <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                  {modalError}
                </div>
              )}
              {!modalLoading && !modalError && (
                <>
                  {/* ESTADO */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--nomi-teal)" }}>Estado</p>
                    <div className="flex items-center gap-3 flex-wrap">
                      {["PENDING","CONFIRMED","PROCESSED","DISPATCHED","DELIVERED","CANCELLED"].map((s) => {
                        const sc = statusConfig[s] || { label: s, color: "var(--nomi-muted)", bg: "var(--nomi-gray)" };
                        const order = orders.find(o => o.id === openOrderId);
                        const isCurrent = order?.status === s;
                        return (
                          <button key={s} onClick={() => updateOrderStatus(openOrderId!, s as any)} disabled={updatingStatus || isCurrent}
                            className="text-xs font-bold px-3 py-1.5 rounded-full cursor-pointer disabled:opacity-60 transition"
                            style={isCurrent
                              ? { backgroundColor: sc.bg, color: sc.color, border: `2px solid ${sc.color}` }
                              : { backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)", border: "1.5px solid var(--nomi-border)" }}>
                            {sc.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>

                  {/* ITEMS */}
                  <div>
                    <p className="text-xs font-bold uppercase tracking-wide mb-2" style={{ color: "var(--nomi-teal)" }}>Productos</p>
                    {modalItems.length === 0 ? (
                      <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>No hay items en esta orden</p>
                    ) : (
                      <div className="space-y-2">
                        {modalItems.map((it) => (
                          <div key={it.id} className="flex items-center justify-between px-4 py-3 rounded-xl"
                            style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                            <div>
                              <div className="font-semibold text-sm" style={{ color: "var(--nomi-navy)" }}>{it.name_snapshot}</div>
                              <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>Cant: {it.qty} · Precio unit: {money(it.price_snapshot)}</div>
                            </div>
                            <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                              {money(Number(it.price_snapshot) * Number(it.qty))}
                            </div>
                          </div>
                        ))}
                        <div className="flex justify-between items-center px-4 py-2.5 rounded-xl"
                          style={{ backgroundColor: "var(--nomi-navy)" }}>
                          <span className="text-xs font-bold text-white">Total</span>
                          <span className="font-black text-sm" style={{ color: "var(--nomi-orange)" }}>
                            {money(orders.find(o => o.id === openOrderId)?.subtotal)}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}