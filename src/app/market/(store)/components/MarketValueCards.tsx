import { CreditCard, CalendarDays, ShieldCheck, Truck } from "lucide-react";

const items = [
  {
    icon: CreditCard,
    title: "Compra con tu nómina",
    text: "Accede a productos seleccionados y paga directamente a través de tu empresa. Sin banco.",
    accent: "var(--nomi-orange)",
    bg: "var(--nomi-orange-bg)",
  },
  {
    icon: CalendarDays,
    title: "Elige tus cuotas",
    text: "Divide tu compra en cuotas cómodas. Ves el valor exacto antes de confirmar.",
    accent: "var(--nomi-teal)",
    bg: "var(--nomi-teal-bg)",
  },
  {
    icon: ShieldCheck,
    title: "0% de interés garantizado",
    text: "Lo que ves es lo que pagas. Sin costos ocultos, sin sorpresas al final del mes.",
    accent: "var(--nomi-navy)",
    bg: "var(--nomi-gray)",
  },
  {
    icon: Truck,
    title: "Entrega a domicilio",
    text: "Tu pedido queda registrado para que la marca lo prepare y despache a tu puerta.",
    accent: "var(--nomi-orange)",
    bg: "var(--nomi-orange-bg)",
  },
];

export default function MarketValueCards() {
  return (
    <section>
      <div className="mb-4">
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>
          Por qué NOMI
        </p>
        <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
          Tu salario, tu <span style={{ color: "var(--nomi-orange)" }}>superpoder</span>
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <div
              key={item.title}
              className="rounded-2xl p-5 transition hover:shadow-md"
              style={{ backgroundColor: "#fff", border: "1.5px solid var(--nomi-border)" }}
            >
              <div
                className="w-11 h-11 rounded-2xl flex items-center justify-center mb-4"
                style={{ backgroundColor: item.bg }}
              >
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
  );
}
