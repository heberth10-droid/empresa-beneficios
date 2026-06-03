import Link from "next/link";

export default function MarketFooter() {
  return (
    <footer className="mt-16"
      style={{ backgroundColor: "var(--nomi-navy)", borderTop: "1px solid rgba(255,255,255,0.08)" }}>

      {/* CTA BAND */}
      <div className="py-10 px-4" style={{ backgroundColor: "var(--nomi-navy-dark)" }}>
        <div className="max-w-4xl mx-auto text-center">
          <p className="text-xs font-bold uppercase tracking-widest mb-3"
            style={{ color: "var(--nomi-teal)" }}>
            ¿Tu empresa aún no tiene NOMI?
          </p>
          <h2 className="text-2xl md:text-3xl font-black text-white mb-3 leading-tight">
            Dale a tus empleados el beneficio que<br className="hidden md:block" />
            <span style={{ color: "var(--nomi-orange)" }}> cambia su calidad de vida.</span>
          </h2>
          <p className="text-sm mb-6" style={{ color: "rgba(255,255,255,0.55)" }}>
            Sin costo para la empresa. Sin trámites complicados. Sin intereses para el empleado.
          </p>
          <div className="flex items-center justify-center gap-3 flex-wrap">
            <Link href="/company"
              className="inline-block rounded-full px-6 py-2.5 text-sm font-bold"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              Vincular mi empresa
            </Link>
            <Link href="/market"
              className="inline-block rounded-full px-6 py-2.5 text-sm font-bold"
              style={{ color: "var(--nomi-teal)", border: "1.5px solid rgba(41,184,212,0.4)" }}>
              Explorar el catálogo
            </Link>
          </div>
        </div>
      </div>

      {/* LINKS */}
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-2 md:grid-cols-4 gap-8">

        <div className="col-span-2 md:col-span-1">
          <div className="flex items-center mb-3">
            <span className="text-2xl font-black text-white">N</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black mx-0.5"
              style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
            <span className="text-2xl font-black text-white">MI</span>
          </div>
          <p className="text-sm leading-relaxed" style={{ color: "rgba(255,255,255,0.55)" }}>
            Tu nómina. Tus compras. Sin intereses.<br />
            Bienestar financiero para empleados colombianos.
          </p>
          <div className="mt-4 flex gap-2 flex-wrap">
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ backgroundColor: "rgba(41,184,212,0.12)", color: "var(--nomi-teal)", border: "1px solid rgba(41,184,212,0.25)" }}>
              0% intereses
            </span>
            <span className="text-xs px-2.5 py-1 rounded-full font-semibold"
              style={{ backgroundColor: "rgba(245,166,35,0.12)", color: "var(--nomi-orange)", border: "1px solid rgba(245,166,35,0.25)" }}>
              Sin trámites
            </span>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm">Marketplace</h3>
          <div className="space-y-2.5 text-sm">
            <Link href="/market" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Inicio</Link>
            <Link href="/market/catalog" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Catálogo</Link>
            <Link href="/market/cart" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Carrito</Link>
            <Link href="/login" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Iniciar sesión</Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm">Legal</h3>
          <div className="space-y-2.5 text-sm">
            <Link href="/terms" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Términos y condiciones</Link>
            <Link href="/privacy" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Política de privacidad</Link>
            <Link href="/returns" className="block hover:text-white transition" style={{ color: "rgba(255,255,255,0.55)" }}>Cambios y garantías</Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white mb-4 text-sm">Contacto</h3>
          <div className="space-y-2.5 text-sm" style={{ color: "rgba(255,255,255,0.55)" }}>
            <p>comercial@wellgroup.com.co</p>
            <p>www.wellgroup.com.co</p>
            <p>Lunes a viernes · 8am – 6pm</p>
            <Link href="/company" className="block font-semibold hover:text-white transition"
              style={{ color: "var(--nomi-teal)" }}>
              Alianzas empresariales →
            </Link>
          </div>
        </div>
      </div>

      {/* BOTTOM */}
      <div style={{ borderTop: "1px solid rgba(255,255,255,0.08)" }}>
        <div className="max-w-6xl mx-auto px-4 py-4 flex flex-col md:flex-row items-center justify-between gap-2 text-xs"
          style={{ color: "rgba(255,255,255,0.35)" }}>
          <span>
            © {new Date().getFullYear()}{" "}
            <span className="font-bold" style={{ color: "var(--nomi-orange)" }}>NOMI</span>
            {" "}· Wellgroup SAS · Cali, Colombia
          </span>
          <span>Hecho con ❤️ para los trabajadores colombianos</span>
        </div>
      </div>
    </footer>
  );
}
