import "./globals.css";
import { Providers } from "./providers";

export const metadata = {
  title: "NOVA",
  description: "Marketplace de beneficios corporativos",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="bg-slate-950 text-slate-100">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}