"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import {
  ArrowLeft, Truck, Package, MapPin, CheckCircle2, Download, X, AlertCircle,
} from "lucide-react";

function money(n: any) {
  const x = Number(n || 0);
  return `$${x.toFixed(2)}`;
}

function safeDateTime(iso?: string | null) {
  if (!iso) return "—";
  try { return new Date(iso).toLocaleString(); } catch { return String(iso); }
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

const cardStyle = { border: "1.5px solid var(--nomi-border)" };
const labelStyle = { color: "var(--nomi-navy)" };
const mutedStyle = { color: "var(--nomi-muted)" };
const inputStyle = {
  border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "var(--nomi-gray)",
  borderRadius: "10px", padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%",
};
const selectStyle = { ...inputStyle };

export default function BrandOrderDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();

  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [order, setOrder] = useState<any>(null);
  const [items, setItems] = useState<any[]>([]);
  const [productsById, setProductsById] = useState<Record<string, any>>({});
  const [brandId, setBrandId] = useState<string | null>(null);

  const [updating, setUpdating] = useState(false);

  // ---------- Logística ----------
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [shipment, setShipment] = useState<any>(null);
  const [logisticsType, setLogisticsType] = useState<"NOMI" | "OWN">("NOMI");
  const [selectedWarehouseId, setSelectedWarehouseId] = useState("");
  const [parcel, setParcel] = useState({ weight: "", length: "", width: "", height: "" });
  const [quoting, setQuoting] = useState(false);
  const [rates, setRates] = useState<any[]>([]);
  const [quotationId, setQuotationId] = useState<string | null>(null);
  const [selectedRateId, setSelectedRateId] = useState("");
  const [creatingShipment, setCreatingShipment] = useState(false);
  const [ownCarrier, setOwnCarrier] = useState("");
  const [ownTracking, setOwnTracking] = useState("");
  const [logMsg, setLogMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [destinationEmail, setDestinationEmail] = useState("");
  const [packagings, setPackagings] = useState<any[]>([]);
  const [packageType, setPackageType] = useState("");
  const [packageContent, setPackageContent] = useState("");

  const totalBrand = useMemo(() => {
    return items.reduce((acc, it) => acc + Number(it.price_snapshot || 0) * Number(it.qty || 0), 0);
  }, [items]);

  // Skydropx exige un valor declarado minimo de $10.000 COP
  const declaredAmountForShipping = Math.max(totalBrand, 10000);

  async function load() {
    setLoading(true);
    setErrorMsg(null);

    const { data: userRes } = await supabase.auth.getUser();
    const user = userRes?.user;
    if (!user) { router.push("/login"); return; }

    const { data: u, error: uErr } = await supabase
      .from("users").select("role, brand_id").eq("auth_id", user.id).single();

    if (uErr || !u || u.role !== "BRAND_ADMIN" || !u.brand_id) { router.push("/login"); return; }
    setBrandId(u.brand_id);

    const { data: o, error: oErr } = await supabase
      .from("orders")
      .select("id, created_at, status, brand_status, employee_id, shipping_name, shipping_phone, shipping_email, shipping_address, shipping_city, shipping_department, shipping_notes")
      .eq("id", id).single();

    if (oErr || !o) { setErrorMsg(oErr?.message || "No se pudo cargar la orden."); setLoading(false); return; }
    if (!["CONFIRMED", "PROCESSED"].includes(o.status)) {
      setErrorMsg("Esta orden aún no está lista para despacho.");
      setLoading(false);
      return;
    }
    setOrder(o);

    if ((o as any).shipping_email && (o as any).shipping_email !== "N/A") {
      setDestinationEmail((o as any).shipping_email);
    }

    const { data: prods, error: pErr } = await supabase
      .from("products").select("id, image_url, images, name").eq("brand_id", u.brand_id);
    if (pErr) { setErrorMsg("No se pudieron cargar productos de la marca: " + pErr.message); setLoading(false); return; }

    const productIds = (prods || []).map((p) => p.id);
    const map: Record<string, any> = {};
    for (const p of prods || []) map[p.id] = p;
    setProductsById(map);

    const { data: its, error: itErr } = await supabase
      .from("order_items")
      .select("id, order_id, product_id, name_snapshot, price_snapshot, qty, created_at")
      .eq("order_id", id).in("product_id", productIds).order("created_at", { ascending: true });
    if (itErr) { setErrorMsg("No se pudieron cargar items de esta orden: " + itErr.message); setLoading(false); return; }
    setItems(its || []);

    const { data: whs } = await supabase
      .from("brand_warehouses").select("*").eq("brand_id", u.brand_id).eq("active", true)
      .order("is_default", { ascending: false });
    setWarehouses(whs || []);
    if (whs && whs.length > 0) {
      const def = whs.find((w) => w.is_default) || whs[0];
      setSelectedWarehouseId(def.id);
    }

    try {
      const pkgRes = await fetch("/api/skydropx/packagings", {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({}),
      });
      const pkgData = await pkgRes.json();
      const pkgList = pkgData.data || pkgData.packagings || pkgData || [];
      if (Array.isArray(pkgList)) {
        setPackagings(pkgList);
        if (pkgList.length > 0) {
          setPackageType(pkgList[0].code || pkgList[0].id || pkgList[0].value || "");
        }
      }
    } catch {
      // si falla, el proveedor puede escribirlo manualmente
    }

    const { data: sh } = await supabase.from("shipments").select("*").eq("order_id", id).maybeSingle();
    if (sh) {
      setShipment(sh);
      setLogisticsType(sh.logistics_type === "OWN" ? "OWN" : "NOMI");
      setOwnCarrier(sh.own_carrier || "");
      setOwnTracking(sh.own_tracking_number || "");
    }

    setLoading(false);
  }

  useEffect(() => { load(); // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  async function updateStatus(newStatus: "PENDING" | "DISPATCHED" | "DELIVERED") {
    setErrorMsg(null); setUpdating(true);
    const { error } = await supabase.rpc("brand_update_order_status", { p_order_id: id, p_brand_status: newStatus });
    setUpdating(false);
    if (error) { setErrorMsg(error.message); return; }
    await load();
  }

  async function handleQuote() {
    setLogMsg(null);
    const wh = warehouses.find((w) => w.id === selectedWarehouseId);
    if (!wh) { setLogMsg({ ok: false, text: "Selecciona una bodega de origen" }); return; }
    if (!parcel.weight || !parcel.length || !parcel.width || !parcel.height) {
      setLogMsg({ ok: false, text: "Ingresa peso y dimensiones del paquete" }); return;
    }
    if (!order?.shipping_city || !order?.shipping_department) {
      setLogMsg({ ok: false, text: "La orden no tiene ciudad/departamento de destino" }); return;
    }

    setQuoting(true); setRates([]); setSelectedRateId("");
    try {
      const res = await fetch("/api/skydropx/quote", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          warehouse: { city: wh.city, state: wh.department, postal_code: wh.postal_code || null },
          destination: { city: order.shipping_city, state: order.shipping_department, postal_code: null },
          parcel: {
            weight: Number(parcel.weight), length: Number(parcel.length),
            width: Number(parcel.width), height: Number(parcel.height),
          },
          declaredAmount: declaredAmountForShipping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error cotizando con Skydropx");

      const qId = data.id;
      const allRates = data.rates || [];
      // Solo tarifas realmente cotizables (algunas quedan "not_applicable" por peso/tamaño/valor declarado)
      const rateList = allRates.filter((r: any) => r.success && r.total != null);
      if (!qId || rateList.length === 0) {
        setLogMsg({ ok: false, text: "Ninguna transportadora acepta este paquete con las medidas ingresadas. Intenta con otras dimensiones o peso." });
        setQuoting(false); return;
      }
      setQuotationId(qId);
      setRates(rateList);
      setLogMsg({ ok: true, text: `${rateList.length} tarifas disponibles` });
    } catch (e: any) {
      setLogMsg({ ok: false, text: e.message || "Error cotizando" });
    } finally { setQuoting(false); }
  }

  async function handleCreateShipment() {
    if (!selectedRateId || !quotationId || !brandId) {
      setLogMsg({ ok: false, text: "Selecciona una tarifa primero" }); return;
    }
    if (!packageType) {
      setLogMsg({ ok: false, text: "Selecciona un tipo de empaque" }); return;
    }
    if (!packageContent.trim()) {
      setLogMsg({ ok: false, text: "Describe el contenido del paquete" }); return;
    }
    if (!destinationEmail) {
      setLogMsg({ ok: false, text: "No se encontró el correo del destinatario. No se puede generar la guía." }); return;
    }
    setCreatingShipment(true); setLogMsg(null);
    try {
      const wh = warehouses.find((w) => w.id === selectedWarehouseId);
      const res = await fetch("/api/skydropx/ship", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rateId: selectedRateId,
          warehouse: {
            name: wh?.name, contact_name: wh?.contact_name, contact_phone: wh?.contact_phone,
            contact_email: wh?.contact_email, address: wh?.address, reference: wh?.reference,
          },
          destination: {
            name: order?.shipping_name, phone: order?.shipping_phone, email: destinationEmail,
            address: order?.shipping_address, notes: order?.shipping_notes,
          },
          packageType,
          packageContent: packageContent.trim(),
          declaredAmount: declaredAmountForShipping,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "Error creando la guía en Skydropx");

      // DEBUG TEMPORAL: revisa la consola del navegador (F12) para ver la estructura real
      console.log("RESPUESTA COMPLETA DE SKYDROPX /shipments:", JSON.stringify(data, null, 2));

      const attrs = data.data?.attributes || {};
      const selectedRate = rates.find((r) => r.id === selectedRateId);

      const includedPackage = Array.isArray(data.included)
        ? data.included.find((inc: any) => inc.type === "package")
        : null;
      const pkgAttrs = includedPackage?.attributes || {};

      const payload = {
        order_id: id, brand_id: brandId, warehouse_id: wh?.id || null, logistics_type: "NOMI",
        weight_kg: Number(parcel.weight), length_cm: Number(parcel.length),
        width_cm: Number(parcel.width), height_cm: Number(parcel.height),
        skydropx_quotation_id: quotationId, skydropx_rate_id: selectedRateId,
        skydropx_shipment_id: data.data?.id || null,
        carrier: attrs?.carrier_name || selectedRate?.provider_display_name || null,
        service: selectedRate?.provider_service_name || null,
        shipping_cost: attrs?.total ? Number(attrs.total) : (selectedRate?.total ? Number(selectedRate.total) : null),
        estimated_days: selectedRate?.days || null,
        tracking_number: pkgAttrs?.tracking_number || attrs?.master_tracking_number || null,
        tracking_url: pkgAttrs?.tracking_url_provider || null,
        label_url: pkgAttrs?.label_url || null,
        status: "LABEL_GENERATED", updated_at: new Date().toISOString(),
      };

      const { data: saved, error: saveErr } = await supabase
        .from("shipments").upsert(payload, { onConflict: "order_id" }).select().single();
      if (saveErr) throw new Error("Guía creada en Skydropx pero no se pudo guardar: " + saveErr.message);

      setShipment(saved);
      setLogMsg({ ok: true, text: "Guía generada correctamente" });
    } catch (e: any) {
      setLogMsg({ ok: false, text: e.message || "Error generando la guía" });
    } finally { setCreatingShipment(false); }
  }

  async function handleSaveOwnLogistics() {
    if (!ownCarrier.trim() || !ownTracking.trim()) {
      setLogMsg({ ok: false, text: "Ingresa transportadora y número de guía" }); return;
    }
    setCreatingShipment(true); setLogMsg(null);
    try {
      const payload = {
        order_id: id, brand_id: brandId, logistics_type: "OWN",
        own_carrier: ownCarrier.trim(), own_tracking_number: ownTracking.trim(),
        status: "LABEL_GENERATED", updated_at: new Date().toISOString(),
      };
      const { data: saved, error } = await supabase
        .from("shipments").upsert(payload, { onConflict: "order_id" }).select().single();
      if (error) throw new Error(error.message);
      setShipment(saved);
      setLogMsg({ ok: true, text: "Datos de envío guardados" });
    } catch (e: any) {
      setLogMsg({ ok: false, text: e.message || "Error guardando" });
    } finally { setCreatingShipment(false); }
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (errorMsg && !order) {
    return (
      <div className="space-y-4 max-w-2xl">
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {errorMsg}
        </div>
        <Link href="/brand/orders" className="inline-flex items-center gap-2 text-sm font-bold" style={{ color: "var(--nomi-teal)" }}>
          <ArrowLeft className="w-4 h-4" /> Volver a órdenes
        </Link>
      </div>
    );
  }

  const statusPillStyle = { backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" };

  return (
    <div className="space-y-6 max-w-3xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Orden</p>
          <h1 className="text-3xl font-black" style={labelStyle}>Alistamiento y despacho</h1>
          <p className="text-sm mt-1" style={mutedStyle}>Solo se muestran los productos de tu marca</p>
        </div>
        <Link href="/brand/orders" className="flex items-center gap-2 text-sm font-bold shrink-0" style={{ color: "var(--nomi-teal)" }}>
          <ArrowLeft className="w-4 h-4" /> Volver
        </Link>
      </div>

      {/* Cabecera */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4" style={cardStyle}>
          <div className="text-xs font-bold uppercase tracking-wide" style={mutedStyle}>Fecha y hora</div>
          <div className="font-black mt-1" style={labelStyle}>{safeDateTime(order?.created_at)}</div>
        </div>
        <div className="bg-white rounded-2xl p-4" style={cardStyle}>
          <div className="text-xs font-bold uppercase tracking-wide" style={mutedStyle}>Estado</div>
          <span className="inline-block mt-1 text-xs font-bold px-2.5 py-1 rounded-full" style={statusPillStyle}>
            {order?.brand_status}
          </span>
        </div>
        <div className="bg-white rounded-2xl p-4" style={cardStyle}>
          <div className="text-xs font-bold uppercase tracking-wide" style={mutedStyle}>Total (tu marca)</div>
          <div className="text-xl font-black mt-1" style={{ color: "var(--nomi-orange)" }}>{money(totalBrand)}</div>
        </div>
      </div>

      {/* Acciones estado */}
      <div className="bg-white rounded-2xl p-6 space-y-3" style={cardStyle}>
        <h2 className="font-black text-sm" style={labelStyle}>Actualizar estado</h2>
        <div className="flex flex-wrap gap-2">
          <button disabled={updating} onClick={() => updateStatus("PENDING")}
            className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
            Pendiente
          </button>
          <button disabled={updating} onClick={() => updateStatus("DISPATCHED")}
            className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1.5px solid rgba(245,166,35,0.25)" }}>
            Despachado
          </button>
          <button disabled={updating} onClick={() => updateStatus("DELIVERED")}
            className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer disabled:opacity-60"
            style={{ backgroundColor: "#DCFCE7", color: "#16A34A", border: "1.5px solid rgba(22,163,74,0.25)" }}>
            Entregado
          </button>
        </div>
      </div>

      {/* Dirección de envío */}
      <div className="bg-white rounded-2xl p-6 space-y-3" style={cardStyle}>
        <h2 className="font-black text-sm flex items-center gap-2" style={labelStyle}>
          <MapPin className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} /> Dirección de envío
        </h2>
        <div className="text-sm space-y-1" style={{ color: "var(--nomi-navy)" }}>
          <div><span style={mutedStyle}>Nombre:</span> {order?.shipping_name || "—"}</div>
          <div><span style={mutedStyle}>Teléfono:</span> {order?.shipping_phone || "—"}</div>
          <div><span style={mutedStyle}>Dirección:</span> {order?.shipping_address || "—"}</div>
          <div><span style={mutedStyle}>Ciudad:</span> {order?.shipping_city || "—"}</div>
          <div><span style={mutedStyle}>Departamento:</span> {order?.shipping_department || "—"}</div>
          <div><span style={mutedStyle}>Notas:</span> {order?.shipping_notes || "—"}</div>
        </div>
      </div>

      {/* Logística */}
      <div className="bg-white rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="font-black text-sm flex items-center gap-2" style={labelStyle}>
          <Truck className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} /> Logística
        </h2>

        {shipment && ["QUOTED","LABEL_GENERATED","PICKED_UP","IN_TRANSIT","DELIVERED"].includes(shipment.status) ? (
          <div className="rounded-xl p-4 space-y-2 text-sm" style={{ backgroundColor: "#DCFCE7", border: "1.5px solid rgba(22,163,74,0.25)" }}>
            <div className="font-black flex items-center gap-2" style={{ color: "#16A34A" }}>
              <CheckCircle2 className="w-4 h-4" />
              {shipment.logistics_type === "OWN" ? "Envío con logística propia" : "Guía generada con NOMI"}
            </div>
            {shipment.logistics_type === "OWN" ? (
              <>
                <div><b>Transportadora:</b> {shipment.own_carrier}</div>
                <div><b>Número de guía:</b> {shipment.own_tracking_number}</div>
              </>
            ) : (
              <>
                <div><b>Transportadora:</b> {shipment.carrier || "—"}</div>
                <div><b>Servicio:</b> {shipment.service || "—"}</div>
                <div><b>Costo:</b> {shipment.shipping_cost ? money(shipment.shipping_cost) : "—"}</div>
                <div><b>Número de guía:</b> {shipment.tracking_number || "—"}</div>
                {shipment.label_url && (
                  <a href={shipment.label_url} target="_blank" rel="noreferrer"
                    className="inline-flex items-center gap-1.5 mt-1 font-bold" style={{ color: "#16A34A" }}>
                    <Download className="w-3.5 h-3.5" /> Descargar guía (PDF)
                  </a>
                )}
              </>
            )}
          </div>
        ) : (
          <>
            <div className="flex gap-2">
              <button onClick={() => setLogisticsType("NOMI")}
                className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                style={logisticsType === "NOMI"
                  ? { backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1.5px solid rgba(245,166,35,0.25)" }
                  : { backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
                Logística NOMI
              </button>
              <button onClick={() => setLogisticsType("OWN")}
                className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                style={logisticsType === "OWN"
                  ? { backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)", border: "1.5px solid rgba(245,166,35,0.25)" }
                  : { backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
                Logística propia
              </button>
            </div>

            {logMsg && (
              <div className="fixed inset-0 z-50 flex items-start justify-center pt-24 px-4"
                style={{ backgroundColor: "rgba(0,0,0,0.35)" }}
                onClick={() => setLogMsg(null)}>
                <div onClick={(e) => e.stopPropagation()}
                  className="w-full max-w-md rounded-2xl p-5 shadow-lg relative"
                  style={logMsg.ok
                    ? { backgroundColor: "#fff", border: "1.5px solid rgba(22,163,74,0.3)" }
                    : { backgroundColor: "#fff", border: "1.5px solid rgba(220,38,38,0.3)" }}>
                  <button onClick={() => setLogMsg(null)}
                    className="absolute top-3 right-3 w-7 h-7 flex items-center justify-center rounded-lg cursor-pointer"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-muted)" }}>
                    <X className="w-4 h-4" />
                  </button>
                  <div className="flex items-start gap-3 pr-6">
                    {logMsg.ok
                      ? <CheckCircle2 className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#16A34A" }} />
                      : <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" style={{ color: "#DC2626" }} />}
                    <p className="text-sm font-semibold" style={{ color: logMsg.ok ? "#16A34A" : "#DC2626" }}>
                      {logMsg.text}
                    </p>
                  </div>
                </div>
              </div>
            )}

            {logisticsType === "NOMI" ? (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Bodega de origen</label>
                  <select value={selectedWarehouseId} onChange={(e) => setSelectedWarehouseId(e.target.value)} style={selectStyle}>
                    {warehouses.length === 0 && <option value="">No tienes bodegas creadas</option>}
                    {warehouses.map((w) => (
                      <option key={w.id} value={w.id}>{w.name} — {w.city}</option>
                    ))}
                  </select>
                  {warehouses.length === 0 && (
                    <p className="text-xs mt-1.5" style={{ color: "var(--nomi-orange)" }}>
                      Crea una bodega en <Link href="/brand/warehouses" className="underline font-bold">Mis bodegas</Link> antes de cotizar.
                    </p>
                  )}
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Peso (kg)</label>
                    <input style={inputStyle} value={parcel.weight} onChange={(e) => setParcel({ ...parcel, weight: e.target.value })} type="number" step="0.1" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Largo (cm)</label>
                    <input style={inputStyle} value={parcel.length} onChange={(e) => setParcel({ ...parcel, length: e.target.value })} type="number" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Ancho (cm)</label>
                    <input style={inputStyle} value={parcel.width} onChange={(e) => setParcel({ ...parcel, width: e.target.value })} type="number" />
                  </div>
                  <div>
                    <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Alto (cm)</label>
                    <input style={inputStyle} value={parcel.height} onChange={(e) => setParcel({ ...parcel, height: e.target.value })} type="number" />
                  </div>
                </div>

                <button onClick={handleQuote} disabled={quoting || warehouses.length === 0}
                  className="px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60"
                  style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
                  {quoting ? "Cotizando..." : "Cotizar envío"}
                </button>

                {rates.length > 0 && (
                  <div className="space-y-4">
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Tipo de empaque</label>
                      {packagings.length > 0 ? (
                        <select value={packageType} onChange={(e) => setPackageType(e.target.value)} style={selectStyle}>
                          {packagings.map((p: any, i: number) => {
                            const val = p.code || p.id || p.value || String(p);
                            const label = p.name || p.description || p.label || val;
                            return <option key={i} value={val}>{label}</option>;
                          })}
                        </select>
                      ) : (
                        <input style={inputStyle} value={packageType} onChange={(e) => setPackageType(e.target.value)}
                          placeholder="Ej: 4G (caja)" />
                      )}
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Contenido del paquete</label>
                      <input style={inputStyle} value={packageContent} onChange={(e) => setPackageContent(e.target.value)}
                        placeholder="Ej: Ropa y accesorios" />
                    </div>
                    {!destinationEmail && (
                      <p className="text-xs" style={{ color: "var(--nomi-orange)" }}>
                        No se encontró correo del destinatario — se necesita para generar la guía.
                      </p>
                    )}
                    <div className="text-sm font-black" style={labelStyle}>Selecciona una tarifa:</div>
                    {rates.map((r) => {
                      const rId = r.id;
                      const carrier = r.provider_display_name || "Transportadora";
                      const service = r.provider_service_name || "";
                      const price = Number(r.total || 0);
                      const days = r.days;
                      const selected = selectedRateId === rId;
                      return (
                        <label key={rId} onClick={() => setSelectedRateId(rId)}
                          className="flex items-center justify-between gap-3 p-4 rounded-xl cursor-pointer"
                          style={selected
                            ? { backgroundColor: "var(--nomi-orange-bg)", border: "1.5px solid rgba(245,166,35,0.35)" }
                            : { backgroundColor: "var(--nomi-gray)", border: "1.5px solid var(--nomi-border)" }}>
                          <div className="flex items-center gap-3">
                            <input type="radio" name="rate" checked={selected} onChange={() => setSelectedRateId(rId)} />
                            <div>
                              <div className="font-bold text-sm" style={labelStyle}>{carrier} {service}</div>
                              {days && <div className="text-xs" style={mutedStyle}>{days} días estimados</div>}
                            </div>
                          </div>
                          <div className="font-black" style={{ color: "var(--nomi-orange)" }}>{money(price)}</div>
                        </label>
                      );
                    })}

                    <button onClick={handleCreateShipment} disabled={creatingShipment || !selectedRateId}
                      className="mt-2 w-full py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60"
                      style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                      {creatingShipment ? "Generando guía..." : "Generar guía de envío"}
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Transportadora</label>
                  <input style={inputStyle} value={ownCarrier} onChange={(e) => setOwnCarrier(e.target.value)}
                    placeholder="Ej: Servientrega, Interrapidisimo" />
                </div>
                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={labelStyle}>Número de guía</label>
                  <input style={inputStyle} value={ownTracking} onChange={(e) => setOwnTracking(e.target.value)} />
                </div>
                <button onClick={handleSaveOwnLogistics} disabled={creatingShipment}
                  className="w-full py-3 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60"
                  style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                  {creatingShipment ? "Guardando..." : "Guardar datos de envío"}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Items */}
      <div className="bg-white rounded-2xl p-6 space-y-4" style={cardStyle}>
        <h2 className="font-black text-sm flex items-center gap-2" style={labelStyle}>
          <Package className="w-4 h-4" style={{ color: "var(--nomi-teal)" }} /> Productos (tu marca)
        </h2>

        {items.length === 0 ? (
          <div className="text-sm" style={mutedStyle}>
            Esta orden no contiene productos de tu marca (o no se pudieron filtrar).
          </div>
        ) : (
          <div className="space-y-3">
            {items.map((it) => {
              const p = it.product_id ? productsById[it.product_id] : null;
              const img = getFirstImage(p, "/no-image.png");
              const lineTotal = Number(it.price_snapshot || 0) * Number(it.qty || 0);
              return (
                <div key={it.id} className="flex items-center gap-4 rounded-xl p-3"
                  style={{ backgroundColor: "var(--nomi-gray)", border: "1.5px solid var(--nomi-border)" }}>
                  <img src={img} alt={it.name_snapshot} className="w-16 h-16 rounded-lg object-cover"
                    style={{ border: "1.5px solid var(--nomi-border)" }}
                    onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold truncate" style={labelStyle}>{it.name_snapshot}</div>
                    <div className="text-sm" style={mutedStyle}>{money(it.price_snapshot)} · Cant: {it.qty}</div>
                  </div>
                  <div className="text-right">
                    <div className="font-black" style={{ color: "var(--nomi-orange)" }}>{money(lineTotal)}</div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        <div className="pt-4 flex items-center justify-between" style={{ borderTop: "1.5px solid var(--nomi-border)" }}>
          <div className="font-bold" style={labelStyle}>Total (tu marca)</div>
          <div className="text-xl font-black" style={{ color: "var(--nomi-orange)" }}>{money(totalBrand)}</div>
        </div>
      </div>
    </div>
  );
}
