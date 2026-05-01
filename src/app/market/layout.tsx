import { ReactNode } from "react";
import { CartProvider } from "@/components/cart/CartProvider";
import MarketHeader from "./(store)/components/MarketHeader";
import MarketFooter from "./(store)/components/MarketFooter";

export default function MarketLayout({ children }: { children: ReactNode }) {
  return (
    <CartProvider>
      <div className="min-h-screen bg-white text-slate-900 flex flex-col">
        <MarketHeader />
        <main className="flex-1">{children}</main>
        <MarketFooter />
      </div>
    </CartProvider>
  );
}