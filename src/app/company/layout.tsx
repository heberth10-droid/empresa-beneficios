import { ReactNode } from "react";
import CompanySidebar from "@/components/CompanySidebar";

export const dynamic = "force-dynamic";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <CompanySidebar />
      <main className="flex-1 p-8 overflow-y-auto">{children}</main>
    </div>
  );
}