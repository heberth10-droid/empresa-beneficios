import Link from "next/link";

const NOVA_BLUE = "#071A3A";
const NOVA_AQUA = "#2FF0D6";

export default function MarketFooter() {
  return (
    <footer
      className="mt-12 border-t"
      style={{
        backgroundColor: NOVA_BLUE,
        borderColor: "rgba(255,255,255,0.08)",
      }}
    >
      <div className="max-w-6xl mx-auto px-4 py-10 grid grid-cols-1 md:grid-cols-4 gap-8">
        <div>
          <div className="text-2xl font-black" style={{ color: NOVA_AQUA }}>
            NOVA
          </div>
          <p className="text-sm mt-3 text-white/70">
            Marketplace de beneficios para empleados. Compra productos
            seleccionados y paga por nómina de forma clara y segura.
          </p>
        </div>

        <div>
          <h3 className="font-bold text-white mb-3">Marketplace</h3>
          <div className="space-y-2 text-sm">
            <Link href="/market" className="block text-white/70 hover:text-white">
              Catálogo
            </Link>
            <Link href="/market/cart" className="block text-white/70 hover:text-white">
              Carrito
            </Link>
            <Link href="/login" className="block text-white/70 hover:text-white">
              Iniciar sesión
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white mb-3">Legal</h3>
          <div className="space-y-2 text-sm">
            <Link href="/terms" className="block text-white/70 hover:text-white">
              Términos y condiciones
            </Link>
            <Link href="/privacy" className="block text-white/70 hover:text-white">
              Política de privacidad
            </Link>
            <Link href="/returns" className="block text-white/70 hover:text-white">
              Cambios y garantías
            </Link>
          </div>
        </div>

        <div>
          <h3 className="font-bold text-white mb-3">Contáctanos</h3>
          <div className="space-y-2 text-sm text-white/70">
            <p>Email: soporte@nova.com</p>
            <p>Horario: Lunes a viernes</p>
            <p>Atención a empresas y marcas aliadas.</p>
          </div>
        </div>
      </div>

      <div className="border-t border-white/10">
        <div className="max-w-6xl mx-auto px-4 py-5 text-center text-sm text-white/60">
          ©️ {new Date().getFullYear()}{" "}
          <span style={{ color: NOVA_AQUA, fontWeight: 700 }}>NOVA</span>. Todos
          los derechos reservados.
        </div>
      </div>
    </footer>
  );
}