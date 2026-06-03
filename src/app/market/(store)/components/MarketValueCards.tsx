"use client";

import { useState } from "react";
import { CreditCard, CalendarDays, ShieldCheck, Truck } from "lucide-react";

function formatCOP(n: number) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency",
    currency: "COP",
    maximumFractionDigits: 0,
  }).format(Math.round(n));
}

const benefits = [
  {
    icon: CreditCard,
    title: "0% de interés garantizado",
    text: "Lo que ves es lo que pagas. Sin costos ocultos, sin sorpresas al final del mes.",
    accent: "var(--nomi-orange)",
    bg: "var(--nomi-orange-bg)",
  },
  {
    icon: CalendarDays,
    title: "Aprobación al instante",
    text: "Sin filas ni papeleos. En minutos tienes tu compra aprobada y lista.",
    accent: "var(--nomi-teal)",
    bg: "var(--nomi-teal-bg)",
  },
  {
    icon: ShieldCheck,
    title: "Sin historial crediticio",
    text: "¿DataCrédito? No importa aquí. Con NOMI tu trabajo es tu garantía.",
    accent: "var(--nomi-navy)",
    bg: "var(--nomi-gray)",
  },
  {
    icon: Truck,
    title: "Descuento directo por nómina",
    text: "Tu empresa descuenta automáticamente cada mes. Tú solo compra y disfruta.",
    accent: "var(--nomi-orange)",
    bg: "var(--nomi-orange-bg)",
  },
];

const steps = [
  {
    num: "1",
    color: "var(--nomi-orange)",
    title: "Elige lo que quieres",
    text: "Explora miles de productos en tecnología, hogar, moda, electrodomésticos y más.",
  },
  {
    num: "2",
    color: "var(--nomi-teal)",
    title: "Selecciona tus cuotas",
    text: "Divide tu compra en cuotas cómodas. Tu empresa descuenta directo de tu nómina cada mes.",
  },
  {
    num: "3",
    color: "var(--nomi-navy)",
    title: "¡Recibe tu producto!",
    text: "Sin intereses, sin codeudor, sin banco. Solo disfruta lo que compraste.",
  },
];

export default function MarketValueCards() {
  const [price, setPrice] = useState(1200000);
  const [cuotas, setCuotas] = useState(6);

  return (
    <div className="space-y-14">

      {/* ── CÓMO FUNCIONA ── */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>
            Proceso simple
          </p>
          <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
            Compra en <span style={{ color: "var(--nomi-orange)" }}>3 pasos</span>
          </h2>
        </div>

        <div className="flex flex-col gap-3">
          {steps.map((s) => (
            <div key={s.num} className="flex items-start gap-4 rounded-2xl p-4"
              style={{ backgroundColor: "var(--nomi-gray)", border: "1.5px solid var(--nomi-border)" }}>
              <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                style={{ backgroundColor: s.color }}>
                {s.num}
              </div>
              <div>
                <div className="font-black text-sm mb-1" style={{ color: "var(--nomi-navy)" }}>
                  {s.title}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--nomi-muted)" }}>
                  {s.text}
                </p>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* ── SIMULADOR ── */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>
            Calcula tu cuota
          </p>
          <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
            ¿Cuánto pagarías <span style={{ color: "var(--nomi-orange)" }}>al mes?</span>
          </h2>
        </div>

        <div className="rounded-2xl p-6 md:p-8" style={{ backgroundColor: "var(--nomi-navy)" }}>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">

            {/* CONTROLES */}
            <div className="space-y-6">
              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.55)" }}>
                    Valor del producto
                  </label>
                  <span className="text-sm font-black" style={{ color: "var(--nomi-orange)" }}>
                    {formatCOP(price)}
                  </span>
                </div>
                <input
                  type="range" min={100000} max={5000000} step={50000}
                  value={price}
                  onChange={(e) => setPrice(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--nomi-orange)" }}
                />
                <div className="flex justify-between text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>$100.000</span><span>$5.000.000</span>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-2">
                  <label className="text-xs font-bold uppercase tracking-wide"
                    style={{ color: "rgba(255,255,255,0.55)" }}>
                    Número de cuotas
                  </label>
                  <span className="text-sm font-black" style={{ color: "var(--nomi-teal)" }}>
                    {cuotas} {cuotas === 1 ? "mes" : "meses"}
                  </span>
                </div>
                <input
                  type="range" min={1} max={12} step={1}
                  value={cuotas}
                  onChange={(e) => setCuotas(Number(e.target.value))}
                  className="w-full h-2 rounded-full appearance-none cursor-pointer"
                  style={{ accentColor: "var(--nomi-teal)" }}
                />
                <div className="flex justify-between text-xs mt-1"
                  style={{ color: "rgba(255,255,255,0.3)" }}>
                  <span>1 mes</span><span>12 meses</span>
                </div>
              </div>
            </div>

            {/* RESULTADO */}
            <div className="rounded-2xl p-6 text-center"
              style={{ backgroundColor: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.1)" }}>
              <p className="text-xs font-bold uppercase tracking-widest mb-1"
                style={{ color: "rgba(255,255,255,0.45)" }}>
                Pagarías cada mes
              </p>
              <div className="text-4xl font-black my-3" style={{ color: "var(--nomi-orange)" }}>
                {formatCOP(price / cuotas)}
              </div>
              <div className="flex items-center justify-center gap-3 text-xs mb-4"
                style={{ color: "rgba(255,255,255,0.5)" }}>
                <span>Total: {formatCOP(price)}</span>
                <span>·</span>
                <span className="font-bold" style={{ color: "#4ade80" }}>$0 intereses</span>
              </div>
              
                className="inline-block w-full py-3 rounded-xl text-sm font-black transition"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}
              >
                ¡Quiero esta cuota! &rarr;
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ── POR QUÉ NOMI ── */}
      <section>
        <div className="mb-5">
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>
            Por qué NOMI
          </p>
          <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
            Tu salario, tu{" "}
            <span style={{ color: "var(--nomi-orange)" }}>superpoder</span>
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {benefits.map((item) => {
            const Icon = item.icon;
            return (
              <div key={item.title} className="rounded-2xl p-5 transition hover:shadow-md"
                style={{ backgroundColor: "#fff", border: "1.5px solid var(--nomi-border)" }}>
                <div className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                  style={{ backgroundColor: item.bg }}>
                  <Icon className="w-5 h-5" style={{ color: item.accent }} />
                </div>
                <div className="text-sm font-black mb-2" style={{ color: "var(--nomi-navy)" }}>
                  {item.title}
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "var(--nomi-muted)" }}>
                  {item.text}
                </p>
              </div>
            );
          })}
        </div>
      </section>

    </div>
  );
}
