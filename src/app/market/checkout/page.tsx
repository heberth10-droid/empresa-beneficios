"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

function parsePayDays(raw: any): number[] {
  if (!raw) return [];
  if (Array.isArray(raw)) return raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  if (typeof raw === "string") {
    const s = raw.trim();
    if (s.startsWith("{") && s.endsWith("}")) return s.slice(1,-1).split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n));
    if (s.startsWith("[") && s.endsWith("]")) { try { const a = JSON.parse(s); if (Array.isArray(a)) return a.map((x) => Number(x)).filter((n) => Number.isFinite(n)); } catch {} }
    return s.split(",").map((x) => Number(x.trim())).filter((n) => Number.isFinite(n));
  }
  return [];
}

function buildInstallmentDates(opts: { count: number; pay_frequency?: string | null; pay_days?: any }): string[] {
  const { count } = opts;
  const freq = (opts.pay_frequency || "").toUpperCase();
  const days = parsePayDays(opts.pay_days).sort((a, b) => a - b);
  const today = new Date();
  const results: Date[] = [];
  const addDays = (d: Date, n: number) => { const x = new Date(d); x.setDate(x.getDate() + n); return x; };
  const dateInMonth = (y: number, m: number, d: number) => { const last = new Date(y, m + 1, 0).getDate(); return new Date(y, m, Math.max(1, Math.min(d, last))); };

  if (days.length === 0 || (!freq.includes("MONTH") && !freq.includes("BIWEEK"))) {
    let d = addDays(today, 15);
    for (let i = 0; i < count; i++) { results.push(d); d = addDays(d, 15); }
    return results.map((d) => d.toISOString().slice(0, 10));
  }

  const y = today.getFullYear(); const m = today.getMonth();
  const candidates: Date[] = [];
  for (let k = 0; k < 14; k++) {
    const mm = m + k; const yy = y + Math.floor(mm / 12); const month0 = ((mm % 12) + 12) % 12;
    if (freq.includes("MONTH")) { candidates.push(dateInMonth(yy, month0, days[0])); }
    else { candidates.push(dateInMonth(yy, month0, days[0])); candidates.push(dateInMonth(yy, month0, days[1] ?? days[0])); }
  }

  const filtered = candidates.filter((d) => d.getTime() >= new Date(today.toDateString()).getTime()).sort((a, b) => a.getTime() - b.getTime());
  for (const d of filtered) { if (results.length >= count) break; results.push(d); }
  while (results.length < count) { const last = results[results.length - 1] || addDays(today, 15); results.push(addDays(last, 15)); }
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
  const [validating, setValidating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [docError, setDocError] = useState<string | null>(null);
  const [justConfirmed, setJustConfirmed] = useState(false);
  const [loggedEmployee, setLoggedEmployee] = useState<any>(null);
  const [sessionLoading, setSessionLoading] = useState(true);

  useEffect(() => {
    async function checkSession() {
      const { data: u } = await supabase.auth.getUser();
      const user = u?.user;
      if (!user) { setSessionLoading(false); return; }

      const { data: userRow } = await supabase.from("users").select("role, company_id, employee_id").eq("auth_id", user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE") { setSessionLoading(false); return; }

      let emp: any = null;
      if (userRow.employee_id) {
        const { data } = await supabase.from("employees").select("id, name, document_type, document_number, phone, address, city, active, credit_limit, credit_used, max_installments, company_id").eq("id", userRow.employee_id).single();
        emp = data;
      }
      if (!emp && user.email) {
        const { data } = await supabase.from("employees").select("id, name, document_type, document_number, phone, address, city, active, credit_limit, credit_used, max_installments, company_id").eq("company_id", userRow.company_id).eq("email", user.email).single();
        emp = data;
      }

      if (emp) {
        setLoggedEmployee(emp);
        setDocumentType(emp.document_type || "CC");
        setDocumentNumber(emp.document_number || "");
        setShippingName(emp.name || "");
        setShippingPhone(emp.phone || "");
        setShippingAddress(emp.address || "");
        setShippingCity(emp.city || "");
        setEmployeeInfo(emp);

        if (emp.company_id) {
          const { data: comp } = await supabase.from("companies").select("id, pay_frequency, pay_days").eq("id", emp.company_id).single();
          if (comp) setCompanyPayConfig(comp);
        }
      }
      setSessionLoading(false);
    }
    checkSession();
  }, []);

  async function validateDocument() {
    setDocError(null);
    setEmployeeInfo(null);
    setCompanyPayConfig(null);
    const doc = documentNumber.trim();
    if (!doc) { setDocError("Ingresa tu numero de documento."); return; }

    setValidating(true);
    const { data: emp, error } = await supabase.from("employees")
      .select("id, active, company_id, credit_limit, credit_used, max_installments")
      .eq("document_type", documentType).eq("document_number", doc).single();
    setValidating(false);

    if (error || !emp) {
      setDocError("Este documento no esta registrado. Consulta con el administrador de tu empresa.");
      return;
    }

    setEmployeeInfo(emp);
    const mi = Number(emp.max_installments || 1);
    if (Number.isFinite(mi) && installments > mi) setInstallments(mi);

    if (emp.company_id) {
      const { data: comp } = await supabase.from("companies").select("id, pay_frequency, pay_days").eq("id", emp.company_id).single();
      if (comp) setCompanyPayConfig(comp);
    }
  }

  const installmentAmount = useMemo(() => Math.round(Number(subtotal || 0) / Math.max(1, Number(installments || 1))), [subtotal, installments]);
  const maxInstallments = useMemo(() => { const m = Number(employeeInfo?.max_installments); return Number.isFinite(m) && m > 0 ? m : 1; }, [employeeInfo]);
  const creditLimit = useMemo(() => { const c = Number(employeeInfo?.credit_limit); return Number.isFinite(c) ? c : 0; }, [employeeInfo]);
  const creditUsed = useMemo(() => { const c = Number(employeeInfo?.credit_used); return Number.isFinite(c) ? c : 0; }, [employeeInfo]);
  const creditAvailable = useMemo(() => Math.max(0, creditLimit - creditUsed), [creditLimit, creditUsed]);
  const exceedsLimit = creditLimit > 0 && installmentAmount > creditAvailable;

  const scheduleDates = useMemo(() => buildInstallmentDates({
    count: Math.max(1, Number(installments || 1)),
    pay_frequency: companyPayConfig?.pay_frequency,
    pay_days: companyPayConfig?.pay_days,
  }), [installments, companyPayConfig]);

  useEffect(() => {
    if (!justConfirmed && items && items.length === 0) router.push("/market/cart");
  }, [items, justConfirmed, router]);

  async function confirmOrder() {
    setErrorMsg(null);
    if (!documentNumber.trim()) return setErrorMsg("Debes ingresar tu numero de documento.");
    if (!shippingName.trim()) return setErrorMsg("Falta el nombre para el envio.");
    if (!shippingPhone.trim()) return setErrorMsg("Falta el telefono para el envio.");
    if (!shippingAddress.trim()) return setErrorMsg("Falta la direccion.");
    if (!shippingCity.trim()) return setErrorMsg("Falta la ciudad.");
    if (!shippingDepartment.trim()) return setErrorMsg("Falta el departamento.");
    if (!employeeInfo) return setErrorMsg("Valida tu documento antes de continuar.");
    if (employeeInfo.active === false) return setErrorMsg("Empleado inactivo. Contacta a tu empresa.");
    if (exceedsLimit) return setErrorMsg("La cuota supera el cupo disponible.");
    if (installments > maxInstallments) return setErrorMsg("Numero de cuotas no permitido.");

    setLoading(true);
    const { data: orderId, error } = await supabase.rpc("create_order_by_document", {
      p_document_type: documentType,
      p_document_number: documentNumber.trim(),
      p_installments: installments,
      p_cart: (items || []).map((it) => ({ product_id: it.id, name: it.name, price: it.price, qty: it.qty })),
      p_shipping_name: shippingName.trim(),
      p_shipping_phone: shippingPhone.trim(),
      p_shipping_address: shippingAddress.trim(),
      p_shipping_city: shippingCity.trim(),
      p_shipping_department: shippingDepartment.trim(),
      p_shipping_notes: shippingNotes.trim(),
    });
    setLoading(false);

    if (error || !orderId) { setErrorMsg(error?.message || "No se pudo confirmar la compra."); return; }
    setJustConfirmed(true);
    router.push(`/market/order/${orderId}`);
    setTimeout(() => clear(), 50);
  }

  const IS = { border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff", borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%" };
  const IS_DISABLED = { ...IS, backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" };

  if (sessionLoading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Marketplace</p>
          <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Finalizar compra</h1>
        </div>
        <Link href="/market/cart" className="text-sm font-semibold" style={{ color: "var(--nomi-orange)" }}>
          Volver al carrito
        </Link>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {errorMsg}
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">

        <div className="space-y-5">

          {/* DOCUMENTO */}
          <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <div>
              <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Validacion del empleado</h2>
              {loggedEmployee && (
                <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-teal)" }}>
                  Sesion activa como {loggedEmployee.name}
                </p>
              )}
            </div>

            <div className="flex gap-3">
              <div style={{ width: "100px" }}>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Tipo</label>
                <select value={documentType} onChange={(e) => { setDocumentType(e.target.value); setEmployeeInfo(null); setDocError(null); }}
                  disabled={!!loggedEmployee} style={loggedEmployee ? IS_DISABLED : IS}>
                  <option value="CC">CC</option>
                  <option value="CE">CE</option>
                </select>
              </div>
              <div className="flex-1">
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Numero de documento</label>
                <div className="flex gap-2">
                  <input value={documentNumber}
                    onChange={(e) => { setDocumentNumber(e.target.value); if (!loggedEmployee) { setEmployeeInfo(null); setDocError(null); } }}
                    onKeyDown={(e) => { if (e.key === "Enter" && !loggedEmployee) validateDocument(); }}
                    disabled={!!loggedEmployee}
                    placeholder="Ej: 1020304050"
                    style={loggedEmployee ? IS_DISABLED : IS} />
                  {!loggedEmployee && (
                    <button onClick={validateDocument} disabled={validating || !documentNumber.trim()}
                      className="px-4 py-2 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50 shrink-0"
                      style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
                      {validating ? "..." : "Validar"}
                    </button>
                  )}
                </div>
                {!loggedEmployee && !employeeInfo && (
                  <p className="text-xs mt-1.5" style={{ color: "var(--nomi-muted)" }}>
                    Ingresa tu documento y presiona Validar
                  </p>
                )}
              </div>
            </div>

            {docError && (
              <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                {docError}
              </div>
            )}

            {/* INFO CUPO */}
            {employeeInfo && (
              <div className="rounded-xl p-4 space-y-3" style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px solid var(--nomi-teal)" }}>
                <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--nomi-teal)" }}>
                  Cupo habilitado por cuota
                </p>
                <div className="grid grid-cols-3 gap-3">
                  <div>
                    <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>Cupo por cuota</p>
                    <p className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>{money(creditLimit)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>Usado</p>
                    <p className="font-black text-sm" style={{ color: "var(--nomi-orange)" }}>{money(creditUsed)}</p>
                  </div>
                  <div>
                    <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>Disponible</p>
                    <p className="font-black text-sm" style={{ color: "#16A34A" }}>{money(creditAvailable)}</p>
                  </div>
                </div>
                <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>
                  Cuotas habilitadas: <b style={{ color: "var(--nomi-navy)" }}>{maxInstallments}</b>
                </p>
              </div>
            )}

            {/* CUOTAS */}
            {employeeInfo && (
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Numero de cuotas</label>
                <select value={installments} onChange={(e) => setInstallments(Number(e.target.value))} style={IS}>
                  {Array.from({ length: Math.max(1, Math.min(12, maxInstallments)) }).map((_, i) => {
                    const v = i + 1;
                    return <option key={v} value={v}>{v} {v === 1 ? "cuota" : "cuotas"}</option>;
                  })}
                </select>
                <div className="mt-2 flex items-center justify-between text-sm">
                  <span style={{ color: "var(--nomi-muted)" }}>Valor por cuota:</span>
                  <span className="font-black" style={{ color: exceedsLimit ? "#DC2626" : "var(--nomi-navy)" }}>
                    {money(installmentAmount)}{exceedsLimit ? " — excede cupo" : ""}
                  </span>
                </div>
              </div>
            )}
          </div>

          {/* CALENDARIO */}
          {employeeInfo && (
            <div className="bg-white rounded-2xl p-5 space-y-3" style={{ border: "1.5px solid var(--nomi-border)" }}>
              <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Calendario de pagos</h2>
              <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>
                Total: <b style={{ color: "var(--nomi-navy)" }}>{money(subtotal)}</b> en {installments} {installments === 1 ? "cuota" : "cuotas"} de <b style={{ color: "var(--nomi-orange)" }}>{money(installmentAmount)}</b>
              </p>
              <div className="space-y-2">
                {scheduleDates.map((d, idx) => (
                  <div key={idx} className="flex items-center justify-between px-3 py-2 rounded-xl text-sm"
                    style={{ backgroundColor: "var(--nomi-gray)", border: "1px solid var(--nomi-border)" }}>
                    <span style={{ color: "var(--nomi-muted)" }}>Cuota #{idx + 1}</span>
                    <span style={{ color: "var(--nomi-muted)" }}>{d}</span>
                    <span className="font-bold" style={{ color: "var(--nomi-navy)" }}>{money(installmentAmount)}</span>
                  </div>
                ))}
              </div>
              <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>*Fechas estimadas segun la regla de nomina de tu empresa.</p>
            </div>
          )}

          {/* ENVIO */}
          <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Direccion de envio</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Nombre completo</label>
                <input value={shippingName} onChange={(e) => setShippingName(e.target.value)} placeholder="Nombre y apellido" style={IS} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Telefono</label>
                <input value={shippingPhone} onChange={(e) => setShippingPhone(e.target.value)} placeholder="3001234567" style={IS} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Direccion</label>
              <input value={shippingAddress} onChange={(e) => setShippingAddress(e.target.value)} placeholder="Calle, carrera, #, apto..." style={IS} />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Ciudad</label>
                <input value={shippingCity} onChange={(e) => setShippingCity(e.target.value)} placeholder="Ej: Cali" style={IS} />
              </div>
              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Departamento</label>
                <input value={shippingDepartment} onChange={(e) => setShippingDepartment(e.target.value)} placeholder="Ej: Valle del Cauca" style={IS} />
              </div>
            </div>
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Notas (opcional)</label>
              <textarea value={shippingNotes} onChange={(e) => setShippingNotes(e.target.value)}
                rows={3} placeholder="Indicaciones para el mensajero..."
                style={{ ...IS, resize: "none" }} />
            </div>
          </div>
        </div>

        {/* RESUMEN DERECHA */}
        <div className="space-y-5">
          <div className="bg-white rounded-2xl p-5 space-y-4 md:sticky md:top-24" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Resumen del pedido</h2>

            <div className="space-y-3">
              {(items || []).map((it) => (
                <div key={it.id} className="flex items-center justify-between gap-3">
                  <div className="text-sm flex-1" style={{ color: "var(--nomi-navy)" }}>
                    {it.name} <span style={{ color: "var(--nomi-muted)" }}>x{it.qty}</span>
                  </div>
                  <div className="font-semibold text-sm shrink-0" style={{ color: "var(--nomi-navy)" }}>
                    {money(Number(it.price) * Number(it.qty))}
                  </div>
                </div>
              ))}
            </div>

            <div className="flex items-center justify-between pt-3" style={{ borderTop: "1.5px solid var(--nomi-border)" }}>
              <span className="text-sm font-bold" style={{ color: "var(--nomi-muted)" }}>Total</span>
              <span className="font-black text-xl" style={{ color: "var(--nomi-navy)" }}>{money(subtotal)}</span>
            </div>

            <button onClick={confirmOrder} disabled={loading || !employeeInfo || exceedsLimit}
              className="w-full py-3.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50 transition"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              {loading ? "Confirmando..." : "Confirmar compra"}
            </button>

            {!employeeInfo && (
              <p className="text-xs text-center" style={{ color: "var(--nomi-muted)" }}>
                {loggedEmployee ? "Cargando tu informacion..." : "Valida tu documento para continuar"}
              </p>
            )}

            <div className="text-xs text-center space-y-1" style={{ color: "var(--nomi-muted)" }}>
              <p>✓ 0% intereses · Descuento automatico por nomina</p>
              <p>✓ Sin estudio de credito · Aprobacion inmediata</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function CheckoutPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
      </div>
    }>
      <CheckoutPageContent />
    </Suspense>
  );
}
