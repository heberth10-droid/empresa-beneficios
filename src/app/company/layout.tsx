"use client";

import { ReactNode, useState } from "react";
import CompanySidebar from "@/components/CompanySidebar";
import { Menu, X } from "lucide-react";

export const dynamic = "force-dynamic";

export default function CompanyLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: "var(--nomi-gray)" }}>

      <div className="hidden md:block">
        <CompanySidebar />
      </div>

      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          <div className="relative z-10" style={{ width: "260px" }}>
            <button onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer z-10"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
            <CompanySidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      <div className="flex-1 flex flex-col min-w-0">
        <div className="md:hidden flex items-center justify-between px-4 py-3 sticky top-0 z-40"
          style={{ backgroundColor: "var(--nomi-navy)", borderBottom: "1px solid rgba(255,255,255,0.08)" }}>
          <button onClick={() => setSidebarOpen(true)}
            className="w-9 h-9 flex items-center justify-center rounded-xl cursor-pointer"
            style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
            <Menu className="w-5 h-5 text-white" />
          </button>
          <div className="flex items-center">
            <span className="text-xl font-black text-white">N</span>
            <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black mx-0.5"
              style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
            <span className="text-xl font-black text-white">MI</span>
            <span className="text-xs ml-2 font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Empresa</span>
          </div>
          <div className="w-9" />
        </div>
        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-6 max-w-6xl mx-auto">{children}</div>
        </main>
      </div>
    </div>
  );
}
