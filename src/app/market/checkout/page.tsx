"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

function money(n: any) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

function addDays(d: Date, days: number) {
  const x = new Date(d);
  x.setDate(x.getDate() + days);
  return x;
}

function parsePayDays(raw: any): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));

  if (typeof raw === "string") {
    const s = raw.trim();

    if (s.startsWith("{") && s.endsWith("}")) {
      return s
        .slice(1, -1)
        .split(",")
        .map((x) => Number(x.trim()))
        .filter((n) => Number.isFinite(n));
    }

    if (s.startsWith("[") && s.endsWith("]")) {
      try {
        const arr = JSON.parse(s);
        if (Array.isArray(arr)) {
          return arr.map((x) => Number(x)).filter((n) => Number.isFinite(n));
        }
      } catch {}
    }

    return s
      .split(",")
      .map((x) => Number(x.trim()))
      .filter((n) => Number.isFinite(n));
  }

  return [];
}

function buildInstallmentDates(opts: {
  count: number;
  pay_frequency?: string | null;
  pay_days?: any;
}): string[] {
  const { count } = opts;
  const freq = (opts.pay_frequency || "").toUpperCase();
  const days = parsePayDays(opts.pay_days).sort((a, b) => a - b);

  const today = new Date();
  const results: Date[] = [];

  if (days.length === 0 || (!freq.includes("MONTH") && !freq.includes("BIWEEK"))) {
    let d = addDays(today, 15);
    for (let i = 0; i < count; i++) {
      results.push(d);
      d = addDays(d, 15);
    }
    return results.map((d) => d.toISOString().slice(0, 10));
  }

  const dateInMonth = (year: number, month0: number, day: number) => {
    const lastDay = new Date(year, month0 + 1, 0).getDate();
    const safeDay = Math.max(1, Math.min(day, lastDay));
    return new Date(year, month0, safeDay);
  };

  const y = today.getFullYear();
  const m = today.getMonth();

  const candidateDates: Date[] = [];

  for (let k = 0; k < 14; k++) {
    const mm = m + k;
    const yy = y + Math.floor(mm / 12);
    const month0 = ((mm % 12) + 12) % 12;

    if (freq.includes("MONTH")) {
      candidateDates.push(dateInMonth(yy, month0, days[0]));
    } else {
      const d1 = days[0];
      const d2 = days[1] ?? days[0];
      candidateDates.push(dateInMonth(yy, month0, d1));
      candidateDates.push(dateInMonth(yy, month0, d2));
    }
  }

  const filtered = candidateDates
    .filter((d) => d.getTime() >= new Date(today.toDateString()).getTime())
    .sort((a, b) => a.getTime() - b.getTime());

  for (const d of filtered) {
    if (results.length >= count) break;
    results.push(d);
  }

  while (results.length < count) {
    const last = results[results.length - 1] || addDays(today, 15);
    results.push(addDays(last, 15));
  }

  return results.map((d) => d.toISOString().slice(0, 10));
}

function CheckoutPageContent() {
  const router = useRouter();
  const { items, subtotal, clear } = useCart();

  const [documentType, setDocumentType] = useState("CC");
  const [documentNumber, setDocumentNumber] = useState("");

  const [installments, setInstallments] = useState(1);

  const [shippingName, setShippingName] = useState("");
  const [shippingPhone, setShippingPhone] = useState("");
  const [shippingAddress, setShippingAddress] = useState("");
  const [shippingCity, setShippingCity] = useState("");
  const [shippingDepartment, setShippingDepartment] = useState("");
  const [shippingNotes, setShippingNotes] = useState("");

  const [employeeInfo, setEmployeeInfo] = useState<any>(null);
  const [companyPayConfig, setCompanyPayConfig] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);

  const cartPayload = useMemo(() => {
    return (items || []).map((it) => ({
      id: it.id,
      name: it.name,
      price: it.price,
      qty: it.qty,
    }));
  }, [items]);

  const installmentAmount = useMemo(() => {
    const n = Number(subtotal || 0);
    const k = Math.max(1, Number(installments || 1));
    return n / k;
  }, [subtotal, installments]);

  const maxInstallments = useMemo(() => {
    const m = Number(employeeInfo?.max_installments);
    return Number.isFinite(m) && m > 0 ? m : 6;
  }, [employeeInfo]);

  const creditLimit = useMemo(() => {
    const c = Number(employeeInfo?.credit_limit);
    return Number.isFinite(c) ? c : 0;
  }, [employeeInfo]);

  const scheduleDates = useMemo(() => {
    return buildInstallmentDates({
      count: Math.max(1, Number(installments || 1)),
      pay_frequency: companyPayConfig?.pay_frequency,
      pay_days: companyPayConfig?.pay_days,
    });
  }, [installments, companyPayConfig]);

  useEffect(() => {
    if (!items || items.length === 0) router.push("/market/cart");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    async function loadEmployee() {
      setEmployeeInfo(null);
      setCompanyPayConfig(null);
      setErrorMsg(null);

      const doc = documentNumber.trim();
      if (!doc) return;

      const { data: emp, error } = await supabase
        .from("employees")
        .select("id, active, company_id, credit_limit, max_installments")
        .eq("document_type", documentType)
        .eq("document_number", doc)
        .single();

      if (error || !emp) return;

      setEmployeeInfo(emp);

      if (emp.company_id) {
        const { data: comp } = await supabase
          .from("companies")
          .select("id, pay_frequency, pay_days")
          .eq("id", emp.company_id)
          .single();

        if (comp) setCompanyPayConfig(comp);
      }

      const mi = Number(emp.max_installments || 1);
      if (Number.isFinite(mi) && installments > mi) setInstallments(mi);
    }

    loadEmployee();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [documentType, documentNumber]);

  async function confirmOrder() {
    setErrorMsg(null);

    if (!documentNumber.trim()) return setErrorMsg("Debes ingresar tu número de documento.");
    if (!shippingName.trim()) return setErrorMsg("Falta el nombre para el envío.");
    if (!shippingPhone.trim()) return setErrorMsg("Falta el teléfono para el envío.");
    if (!shippingAddress.trim()) return setErrorMsg("Falta la dirección.");
    if (!shippingCity.trim()) return setErrorMsg("Falta la ciudad.");
    if (!shippingDepartment.trim()) return setErrorMsg("Falta el departamento.");

    if (employeeInfo) {
      if (employeeInfo.active === false) return setErrorMsg("Empleado no encontrado o inactivo.");
      if (creditLimit > 0 && installmentAmount > creditLimit) {
        return setErrorMsg("La cuota supera el límite permitido para este empleado.");
      }
      if (installments > maxInstallments) {
        return setErrorMsg("Cuotas no permitidas para este empleado.");
      }
    }

    setLoading(true);

    const { data: orderId, error } = await supabase.rpc("create_order_by_document", {
      p_document_type: documentType,
      p_document_number: documentNumber.trim(),
      p_installments: installments,
      p_cart: cartPayload,
      p_shipping_name: shippingName.trim(),
      p_shipping_phone: shippingPhone.trim(),
      p_shipping_address: shippingAddress.trim(),
      p_shipping_city: shippingCity.trim(),
      p_shipping_department: shippingDepartment.trim(),
      p_shipping_notes: shippingNotes.trim(),
    });

    setLoading(false);

    if (error || !orderId) {
      setErrorMsg(error?.message || "No se pudo confirmar la compra.");
      return;
    }

    setJustConfirmed(true);
    router.push(`/market/order/${orderId}`);
    setTimeout(() => clear(), 50);
  }

  useEffect(() => {
    if (justConfirmed) return;
    if (items && items.length === 0) router.push("/market/cart");
  }, [items, justConfirmed, router]);

  const canShowLimit = employeeInfo && creditLimit > 0;
  const showMax = employeeInfo && maxInstallments > 0;

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      <div className="flex items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold">Checkout</h1>
          <p className="text-slate-400 text-sm">
            Completa tu documento y la información de envío para confirmar.
          </p>
        </div>

        <Link href="/market/cart" className="text-emerald-400 font-semibold">
          ← Volver al carrito
        </Link>
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-6">
          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Validación del empleado</h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Tipo</div>
                <select
                  value={documentType}
                  onChange={(e) => setDocumentType(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                >
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                  <option value="NIT">NIT</option>
                  <option value="TI">TI</option>
                </select>
              </div>

              <div className="space-y-1 md:col-span-2">
                <div className="text-xs text-slate-400">Número de documento</div>
                <input
                  value={documentNumber}
                  onChange={(e) => setDocumentNumber(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                  placeholder="Ej: 1020304050"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">Cuotas</div>
              <select
                value={installments}
                onChange={(e) => setInstallments(Number(e.target.value))}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
              >
                {Array.from({ length: Math.max(1, Math.min(12, maxInstallments)) }).map((_, i) => {
                  const v = i + 1;
                  return (
                    <option key={v} value={v}>
                      {v} {v === 1 ? "cuota" : "cuotas"}
                    </option>
                  );
                })}
              </select>

              <div className="text-xs text-slate-400 mt-2 space-y-1">
                {showMax && (
                  <div>
                    Máx. cuotas permitidas:{" "}
                    <b className="text-slate-200">{maxInstallments}</b>
                  </div>
                )}
                {canShowLimit && (
                  <div>
                    Cupo máximo por cuota:{" "}
                    <b className="text-emerald-300">{money(creditLimit)}</b>
                  </div>
                )}
                {canShowLimit && (
                  <div>
                    Valor estimado por cuota:{" "}
                    <b className={installmentAmount > creditLimit ? "text-red-300" : "text-slate-200"}>
                      {money(installmentAmount)}
                    </b>
                    {installmentAmount > creditLimit && (
                      <span className="text-red-300"> (excede el cupo)</span>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
            <h2 className="text-lg font-semibold">Resumen de pagos</h2>

            <div className="text-sm text-slate-300">
              Total compra: <b className="text-emerald-300">{money(subtotal)}</b>
            </div>

            <div className="text-sm text-slate-300">
              {installments} {installments === 1 ? "cuota" : "cuotas"} de{" "}
              <b className="text-slate-100">{money(installmentAmount)}</b>
            </div>

            <div className="mt-2 space-y-2">
              {scheduleDates.map((d, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between text-sm border border-slate-800 rounded p-2 bg-slate-950/40"
                >
                  <div className="text-slate-300">Cuota #{idx + 1}</div>
                  <div className="text-slate-400">{d}</div>
                  <div className="text-slate-100 font-semibold">{money(installmentAmount)}</div>
                </div>
              ))}
            </div>

            <div className="text-xs text-slate-500">
              *Las fechas son una previsualización con base en la regla de pago de la empresa.
            </div>
          </div>

          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-4">
            <h2 className="text-lg font-semibold">Dirección de envío</h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Nombre completo</div>
                <input
                  value={shippingName}
                  onChange={(e) => setShippingName(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                  placeholder="Nombre y apellido"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-400">Teléfono</div>
                <input
                  value={shippingPhone}
                  onChange={(e) => setShippingPhone(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                  placeholder="Ej: 3001234567"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">Dirección</div>
              <input
                value={shippingAddress}
                onChange={(e) => setShippingAddress(e.target.value)}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                placeholder="Calle, carrera, #, apto, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="space-y-1">
                <div className="text-xs text-slate-400">Ciudad</div>
                <input
                  value={shippingCity}
                  onChange={(e) => setShippingCity(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                  placeholder="Ej: Bogotá"
                />
              </div>

              <div className="space-y-1">
                <div className="text-xs text-slate-400">Departamento</div>
                <input
                  value={shippingDepartment}
                  onChange={(e) => setShippingDepartment(e.target.value)}
                  className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                  placeholder="Ej: Cundinamarca"
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="text-xs text-slate-400">Notas (opcional)</div>
              <textarea
                value={shippingNotes}
                onChange={(e) => setShippingNotes(e.target.value)}
                className="w-full bg-slate-800 rounded px-3 py-2 text-sm"
                rows={3}
                placeholder="Indicaciones para el mensajero, horario, etc."
              />
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-3">
            <h2 className="text-lg font-semibold">Resumen</h2>

            <div className="space-y-2">
              {(items || []).map((it) => (
                <div key={it.id} className="flex items-center justify-between text-sm">
                  <div className="text-slate-200">
                    {it.name} <span className="text-slate-500">x{it.qty}</span>
                  </div>
                  <div className="text-slate-300">{money(Number(it.price) * Number(it.qty))}</div>
                </div>
              ))}
            </div>

            <div className="border-t border-slate-800 pt-3 flex items-center justify-between">
              <div className="text-slate-300">Subtotal</div>
              <div className="text-emerald-300 font-bold text-xl">{money(subtotal)}</div>
            </div>

            <button
              onClick={confirmOrder}
              disabled={loading}
              className="w-full bg-emerald-500 text-slate-950 font-bold px-6 py-3 rounded hover:bg-emerald-400 transition disabled:opacity-60"
            >
              {loading ? "Confirmando..." : "Confirmar compra"}
            </button>

            <div className="text-xs text-slate-500">
              Al confirmar, se valida empleado/cupo y se genera la orden lista para despacho.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={<div className="p-6">Cargando checkout...</div>}>
      <CheckoutPageContent />
    </Suspense>
  );
}