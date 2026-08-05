import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "NOMI — Marketplace de beneficios corporativos",
  description: "Compra sin intereses con descuento automatico por nomina",
  icons: {
    icon: "/nomi-favicon.png",
    apple: "/nomi-favicon.png",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
