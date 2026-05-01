import { ReactNode } from "react";
import BrandSidebar from "@/components/BrandSidebar";

export const dynamic = "force-dynamic";

export default function BrandLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <BrandSidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}
