"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";

type Company = {
  id: string;
  name: string;
  nit?: string | null;
  sector?: string | null;

  pay_frequency: "MONTHLY" | "BIWEEKLY";
  pay_days: number[];
  pay_timezone: string;

  pay_reminder_days: number; // ✅ NUEVO
};

function parseDays(input: string): number[] {
  const raw = input
    .replaceAll(";", ",")
    .replaceAll(" ", ",")
    .split(",")
    .map((x) => x.trim())
    .filter(Boolean);

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

export default function CompanyConfigPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [okMsg, setOkMsg] = useState<string | null>(null);

  const [company, setCompany] = useState<Company | null>(null);

  // Form
  const [payFrequency, setPayFrequency] = useState<"MONTHLY" | "BIWEEKLY">(
    "MONTHLY"
  );
  const [payDaysInput, setPayDaysInput] = useState("30");
  const [payTimezone, setPayTimezone] = useState("America/Bogota");

  // ✅ NUEVO: días antes para notificar
  const [payReminderDays, setPayReminderDays] = useState<number>(2);

  const parsedDays = useMemo(() => parseDays(payDaysInput), [payDaysInput]);
  const daysValid = useMemo(() => isValidDays(parsedDays), [parsedDays]);

  useEffect(() => {
    async function boot() {
      setErrorMsg(null);
      setOkMsg(null);

      const { data: userRes } = await supabase.auth.getUser();
      const authUser = userRes.user;

      if (!authUser) {
        router.push("/login");
        return;
      }

      const { data: u, error: uErr } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", authUser.id)
        .single();

      if (uErr || !u) {
        router.push("/login");
        return;
      }

      if (u.role !== "COMPANY_ADMIN") {
        router.push("/login");
        return;
      }

      if (!u.company_id) {
        setErrorMsg("Tu usuario no tiene company_id asignado en la tabla users.");
        setLoading(false);
        return;
      }

      const { data: c, error: cErr } = await supabase
        .from("companies")
        .select(
          "id, name, nit, sector, pay_frequency, pay_days, pay_timezone, pay_reminder_days"
        )
        .eq("id", u.company_id)
        .single();

      if (cErr || !c) {
        setErrorMsg("No se pudo cargar la empresa: " + (cErr?.message || ""));
        setLoading(false);
        return;
      }

      const comp = c as Company;

      setCompany(comp);
      setPayFrequency(comp.pay_frequency || "MONTHLY");
      setPayDaysInput(
        (comp.pay_days && comp.pay_days.length > 0 ? comp.pay_days : [30]).join(
          ","
        )
      );
      setPayTimezone(comp.pay_timezone || "America/Bogota");

      // ✅ NUEVO
      setPayReminderDays(
        clampInt((comp as any).pay_reminder_days ?? 2, 0, 30)
      );

      setLoading(false);
    }

    boot();
  }, [router]);

  async function save() {
    setErrorMsg(null);
    setOkMsg(null);

    if (!company) return;

    if (!daysValid) {
      setErrorMsg("Los días de pago deben estar entre 1 y 31. Ej: 30 o 15,30");
      return;
    }

    // Regla MVP (para evitar configuraciones raras)
    if (payFrequency === "MONTHLY" && parsedDays.length !== 1) {
      setErrorMsg("Para pago mensual debes poner 1 solo día. Ej: 30");
      return;
    }
    if (payFrequency === "BIWEEKLY" && parsedDays.length !== 2) {
      setErrorMsg("Para pago quincenal debes poner 2 días. Ej: 15,30");
      return;
    }

    const reminderDaysSafe = clampInt(payReminderDays, 0, 30);

    setSaving(true);

    const { error } = await supabase
      .from("companies")
      .update({
        pay_frequency: payFrequency,
        pay_days: parsedDays,
        pay_timezone: payTimezone,
        pay_reminder_days: reminderDaysSafe, // ✅ NUEVO
      })
      .eq("id", company.id);

    setSaving(false);

    if (error) {
      setErrorMsg("No se pudo guardar la configuración: " + error.message);
      return;
    }

    setCompany({
      ...company,
      pay_frequency: payFrequency,
      pay_days: parsedDays,
      pay_timezone: payTimezone,
      pay_reminder_days: reminderDaysSafe,
    });

    setOkMsg(
      "✅ Guardado. A partir de ahora las nuevas compras calcularán first_payment_date y el calendario de cuotas con esta regla. Las alertas de nómina usarán pay_reminder_days."
    );
  }

  if (loading) {
    return <div className="text-slate-300">Cargando configuración...</div>;
  }

  if (!company) {
    return <div className="text-red-300">No se pudo cargar la empresa.</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Configuración</h1>
        <p className="text-slate-400 text-sm">
          {company.name} {company.nit ? `• NIT ${company.nit}` : ""}
        </p>
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
      )}

      {okMsg && (
        <div className="bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 rounded p-3 text-sm">
          {okMsg}
        </div>
      )}

      <div className="border border-slate-800 bg-slate-900 rounded-lg p-5 space-y-5">
        <div>
          <h2 className="text-lg font-semibold">Regla de nómina</h2>
          <p className="text-slate-400 text-sm">
            Esto define el <b>día de descuento</b> de la primera cuota y las
            siguientes.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="text-sm text-slate-300">Frecuencia</label>
            <select
              value={payFrequency}
              onChange={(e) => {
                const v = e.target.value as "MONTHLY" | "BIWEEKLY";
                setPayFrequency(v);
                if (v === "MONTHLY") setPayDaysInput("30");
                if (v === "BIWEEKLY") setPayDaysInput("15,30");
              }}
              className="w-full bg-slate-800 rounded px-3 py-2"
            >
              <option value="MONTHLY">Mensual</option>
              <option value="BIWEEKLY">Quincenal</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Días de pago</label>
            <input
              value={payDaysInput}
              onChange={(e) => setPayDaysInput(e.target.value)}
              placeholder={payFrequency === "MONTHLY" ? "Ej: 30" : "Ej: 15,30"}
              className="w-full bg-slate-800 rounded px-3 py-2"
            />
            <p className="text-xs text-slate-500">
              {payFrequency === "MONTHLY"
                ? "Mensual: 1 día (1–31). Ej: 30"
                : "Quincenal: 2 días (1–31). Ej: 15,30"}
            </p>

            {!daysValid && (
              <p className="text-xs text-red-300">
                Días inválidos. Deben ser enteros entre 1 y 31.
              </p>
            )}
          </div>

          <div className="space-y-2">
            <label className="text-sm text-slate-300">Zona horaria</label>
            <input
              value={payTimezone}
              onChange={(e) => setPayTimezone(e.target.value)}
              placeholder="America/Bogota"
              className="w-full bg-slate-800 rounded px-3 py-2"
            />
            <p className="text-xs text-slate-500">
              Recomendado: <b>America/Bogota</b>
            </p>
          </div>
        </div>

        {/* ✅ NUEVO: Notificación previa */}
        <div className="border-t border-slate-800 pt-4">
          <h3 className="font-semibold">Notificaciones de nómina</h3>
          <p className="text-slate-400 text-sm">
            Define cuántos días antes quieres recibir el aviso de los descuentos
            próximos.
          </p>

          <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
            <div className="space-y-2">
              <label className="text-sm text-slate-300">
                Notificar (días antes)
              </label>
              <input
                type="number"
                min={0}
                max={30}
                value={payReminderDays}
                onChange={(e) =>
                  setPayReminderDays(clampInt(Number(e.target.value), 0, 30))
                }
                className="w-full bg-slate-800 rounded px-3 py-2"
              />
              <p className="text-xs text-slate-500">
                0 = el mismo día • recomendado: 2
              </p>
            </div>

            <div className="md:col-span-2 text-sm text-slate-300">
              <b>Ejemplo:</b> si tu día de descuento es{" "}
              <span className="text-emerald-300">{parsedDays.join(", ")}</span>{" "}
              y configuras{" "}
              <span className="text-emerald-300">{payReminderDays}</span> días
              antes, NOVA te avisará con el listado de empleados a descontar.
            </div>
          </div>
        </div>

        <div className="border-t border-slate-800 pt-4 flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="text-sm text-slate-300">
            <b>Vista previa:</b>{" "}
            {payFrequency === "MONTHLY" ? "Mensual" : "Quincenal"} • Días:{" "}
            <span className="text-emerald-300">
              {parsedDays.join(", ") || "—"}
            </span>{" "}
            • TZ: <span className="text-emerald-300">{payTimezone}</span> • Aviso:{" "}
            <span className="text-emerald-300">{payReminderDays}</span> días antes
          </div>

          <button
            onClick={save}
            disabled={saving}
            className="px-5 py-2 rounded bg-emerald-500 text-slate-950 font-bold hover:bg-emerald-400 transition disabled:opacity-60"
          >
            {saving ? "Guardando..." : "Guardar"}
          </button>
        </div>
      </div>

      <div className="text-xs text-slate-500">
        Nota: esta regla afecta <b>órdenes nuevas</b> (calendario de cuotas).
        Las alertas usan <b>pay_reminder_days</b> y siempre se calculan sobre las
        cuotas pendientes.
      </div>
    </div>
  );
}