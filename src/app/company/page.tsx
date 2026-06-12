"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { Save } from "lucide-react";

type Company = {
  id: string;
  name: string;
  nit?: string | null;
  sector?: string | null;
  pay_frequency: "MONTHLY" | "BIWEEKLY";
  pay_days: number[];
  pay_timezone: string;
  pay_reminder_days: number;
};

function parseDays(input: string): number[] {
  const raw = input.replaceAll(";",",").replaceAll(" ",",").split(",").map((x) => x.trim()).filter(Boolean);
  const days = raw.map((x) => Number(x)).filter((n) => Number.isFinite(n));
  return Array.from(new Set(days)).sort((a, b) => a - b);
}
function isValidDays(days: number[]) {
  if (!days || days.length === 0) return false;
  return days.every((d) => Number.isInteger(d) && d >= 1 && d <= 31);
}
function clampInt(n: number, min: number, max: number) {
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, Math.trunc(n)));
}

const IS = {
  border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)",
  backgroundColor: "var(--nomi-gray)", borderRadius: "10px",
  padding: "10px 14px", fontSize: "14px", outline: "none", width: "100%",
};

export default function CompanyConfigPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);
  const [company, setCompany] = useState<Company | null>(null);
  const [payFrequency, setPayFrequency] = useState<"MONTHLY" | "BIWEEKLY">("MONTHLY");
  const [payDaysInput, setPayDaysInput] = useState("30");
  const [payTimezone, setPayTimezone] = useState("America/Bogota");
  const [payReminderDays, setPayReminderDays] = useState<number>(2);

  const parsedDays = useMemo(() => parseDays(payDaysInput), [payDaysInput]);
  const daysValid = useMemo(() => isValidDays(parsedDays), [parsedDays]);

  useEffect(() => {
    async function boot() {
      setErrorMsg(null); setOkMsg(null);
      const { data: userRes } = await supabase.auth.getUser();
      const authUser = userRes.user;
      if (!authUser) { router.push("/login"); return; }
      const { data: u, error: uErr } = await supabase.from("users").select("*").eq("auth_id", authUser.id).single();
      if (uErr || !u) { router.push("/login"); return; }
      if (u.role !== "COMPANY_ADMIN") { router.push("/login"); return; }
      if (!u.company_id) { setErrorMsg("Tu usuario no tiene company_id asignado."); setLoading(false); return; }
      const { data: c, error: cErr } = await supabase.from("companies")
        .select("id, name, nit, sector, pay_frequency, pay_days, pay_timezone, pay_reminder_days")
        .eq("id", u.company_id).single();
      if (cErr || !c) { setErrorMsg("No se pudo cargar la empresa: " + (cErr?.message || "")); setLoading(false); return; }
      const comp = c as Company;
      setCompany(comp);
      setPayFrequency(comp.pay_frequency || "MONTHLY");
      setPayDaysInput((comp.pay_days && comp.pay_days.length > 0 ? comp.pay_days : [30]).join(","));
      setPayTimezone(comp.pay_timezone || "America/Bogota");
      setPayReminderDays(clampInt((comp as any).pay_reminder_days ?? 2, 0, 30));
      setLoading(false);
    }
    boot();
  }, [router]);

  async function save() {
    setErrorMsg(null); setOkMsg(null);
    if (!company) return;
    if (!daysValid) { setErrorMsg("Los dias de pago deben estar entre 1 y 31."); return; }
    if (payFrequency === "MONTHLY" && parsedDays.length !== 1) { setErrorMsg("Para pago mensual pon 1 solo dia. Ej: 30"); return; }
    if (payFrequency === "BIWEEKLY" && parsedDays.length !== 2) { setErrorMsg("Para pago quincenal pon 2 dias. Ej: 15,30"); return; }
    const reminderDaysSafe = clampInt(payReminderDays, 0, 30);
    setSaving(true);
    const { error } = await supabase.from("companies").update({
      pay_frequency: payFrequency, pay_days: parsedDays,
      pay_timezone: payTimezone, pay_reminder_days: reminderDaysSafe,
    }).eq("id", company.id);
    setSaving(false);
    if (error) { setErrorMsg("No se pudo guardar: " + error.message); return; }
    setCompany({ ...company, pay_frequency: payFrequency, pay_days: parsedDays, pay_timezone: payTimezone, pay_reminder_days: reminderDaysSafe });
    setOkMsg("Configuracion guardada correctamente.");
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (!company) return (
    <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
      No se pudo cargar la empresa.
    </div>
  );

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1" style={{ color: "var(--nomi-teal)" }}>Panel de empresa</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>{company.name}</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          {company.nit ? `NIT ${company.nit}` : ""}{company.sector ? ` · ${company.sector}` : ""}
        </p>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>
          {errorMsg}
        </div>
      )}
      {okMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
          {okMsg}
        </div>
      )}

      {/* REGLA DE NOMINA */}
      <div className="bg-white rounded-2xl p-6 space-y-5" style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div>
          <h2 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Regla de nomina</h2>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            Define el dia de descuento de la primera cuota y las siguientes
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Frecuencia</label>
            <select style={IS} value={payFrequency}
              onChange={(e) => {
                const v = e.target.value as "MONTHLY" | "BIWEEKLY";
                setPayFrequency(v);
                if (v === "MONTHLY") setPayDaysInput("30");
                if (v === "BIWEEKLY") setPayDaysInput("15,30");
              }}>
              <option value="MONTHLY">Mensual</option>
              <option value="BIWEEKLY">Quincenal</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Dias de pago</label>
            <input style={IS} value={payDaysInput}
              onChange={(e) => setPayDaysInput(e.target.value)}
              placeholder={payFrequency === "MONTHLY" ? "Ej: 30" : "Ej: 15,30"} />
            <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>
              {payFrequency === "MONTHLY" ? "Mensual: 1 dia (1-31)" : "Quincenal: 2 dias (1-31)"}
            </p>
            {!daysValid && payDaysInput && (
              <p className="text-xs mt-1 font-semibold" style={{ color: "#DC2626" }}>
                Dias invalidos. Deben ser enteros entre 1 y 31.
              </p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Zona horaria</label>
            <input style={IS} value={payTimezone}
              onChange={(e) => setPayTimezone(e.target.value)} placeholder="America/Bogota" />
            <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>Recomendado: America/Bogota</p>
          </div>
        </div>

        {/* NOTIFICACIONES */}
        <div className="pt-4 space-y-4" style={{ borderTop: "1px solid var(--nomi-border)" }}>
          <div>
            <h3 className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Notificaciones de nomina</h3>
            <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
              Cuantos dias antes quieres recibir el aviso de descuentos proximos
            </p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
            <div>
              <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Notificar (dias antes)</label>
              <input type="number" min={0} max={30} style={IS} value={payReminderDays}
                onChange={(e) => setPayReminderDays(clampInt(Number(e.target.value), 0, 30))} />
              <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>0 = el mismo dia · recomendado: 2</p>
            </div>
            <div className="md:col-span-2 px-4 py-3 rounded-xl text-sm" style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)" }}>
              <b>Ejemplo:</b> si tu dia de descuento es{" "}
              <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>{parsedDays.join(", ")}</span>{" "}
              y configuras{" "}
              <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>{payReminderDays}</span>{" "}
              dias antes, NOMI te avisara con el listado de empleados a descontar.
            </div>
          </div>
        </div>

        {/* VISTA PREVIA + GUARDAR */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3 pt-4"
          style={{ borderTop: "1px solid var(--nomi-border)" }}>
          <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>
            <b style={{ color: "var(--nomi-navy)" }}>Vista previa:</b>{" "}
            {payFrequency === "MONTHLY" ? "Mensual" : "Quincenal"} · Dias:{" "}
            <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>{parsedDays.join(", ") || "—"}</span>{" "}
            · TZ: <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>{payTimezone}</span>{" "}
            · Aviso: <span className="font-bold" style={{ color: "var(--nomi-teal)" }}>{payReminderDays}</span> dias antes
          </p>
          <button onClick={save} disabled={saving}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60 shrink-0"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            <Save className="w-4 h-4" />
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>
        Esta regla afecta <b>ordenes nuevas</b>. Las alertas usan <b>pay_reminder_days</b> y se calculan sobre cuotas pendientes.
      </p>
    </div>
  );
}
