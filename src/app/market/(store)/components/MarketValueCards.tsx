import { CreditCard, CalendarDays, ShieldCheck, Truck } from "lucide-react";

export default function MarketValueCards() {
  const items = [
    {
      icon: CreditCard,
      title: "Compra con descuento por nómina",
      text: "Accede a productos seleccionados y paga directamente a través de tu empresa.",
    },
    {
      icon: CalendarDays,
      title: "Elige tus cuotas",
      text: "Antes de confirmar, ves el valor de cada cuota y las fechas de descuento.",
    },
    {
      icon: ShieldCheck,
      title: "Productos verificados",
      text: "Trabajamos con marcas aliadas para ofrecer beneficios exclusivos a empleados.",
    },
    {
      icon: Truck,
      title: "Entrega a domicilio",
      text: "Tu pedido queda registrado para que la marca pueda prepararlo y despacharlo.",
    },
  ];

  return (
    <section className="grid grid-cols-1 md:grid-cols-4 gap-4">
      {items.map((item) => {
        const Icon = item.icon;

        return (
          <div
            key={item.title}
            className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md transition"
          >
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 flex items-center justify-center mb-4">
              <Icon className="w-6 h-6 text-emerald-600" />
            </div>

            <div className="text-sm font-black text-slate-900">
              {item.title}
            </div>

            <p className="text-sm text-slate-500 mt-2">{item.text}</p>
          </div>
        );
      })}
    </section>
  );
}