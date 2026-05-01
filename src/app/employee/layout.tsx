import { ReactNode } from "react";
import EmployeeSidebar from "@/components/EmployeeSidebar";

export const dynamic = "force-dynamic";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <div className="flex min-h-screen bg-slate-950 text-slate-100">
      <EmployeeSidebar />
      <main className="flex-1 p-6 md:p-8 overflow-y-auto">{children}</main>
    </div>
  );
}