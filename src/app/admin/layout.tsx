"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "./components/AdminSidebar";
import { Menu, X } from "lucide-react";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    async function validate() {
      const { data } = await supabase.auth.getUser();
      const user = data?.user;
      if (!user) { router.push("/login"); return; }
      const { data: row } = await supabase
        .from("users").select("role").eq("auth_id", user.id).single();
      if (!row || row.role !== "SUPER_ADMIN") { router.push("/login"); return; }
      setLoading(false);
    }
    validate();
  }, [router]);

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center"
      style={{ backgroundColor: "var(--nomi-navy-dark)" }}>
      <div className="text-center">
        <div className="flex items-center justify-center mb-3">
          <span className="text-3xl font-black text-white">N</span>
          <span className="inline-flex items-center justify-center w-8 h-8 rounded-full border-2 text-base font-black mx-1"
            style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
          <span className="text-3xl font-black text-white">MI</span>
        </div>
        <p className="text-sm" style={{ color: "rgba(255,255,255,0.4)" }}>Verificando acceso...</p>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen flex" style={{ backgroundColor: "var(--nomi-gray)" }}>

      {/* SIDEBAR DESKTOP */}
      <div className="hidden md:block">
        <AdminSidebar />
      </div>

      {/* SIDEBAR MOBILE — overlay */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* BACKDROP */}
          <div className="absolute inset-0 bg-black/50" onClick={() => setSidebarOpen(false)} />
          {/* PANEL */}
          <div className="relative z-10 flex flex-col"
            style={{ backgroundColor: "var(--nomi-navy)", width: "260px" }}>
            <button
              onClick={() => setSidebarOpen(false)}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-xl cursor-pointer"
              style={{ backgroundColor: "rgba(255,255,255,0.1)" }}>
              <X className="w-4 h-4 text-white" />
            </button>
            <AdminSidebar onNavigate={() => setSidebarOpen(false)} />
          </div>
        </div>
      )}

      {/* CONTENIDO */}
      <div className="flex-1 flex flex-col min-w-0">

        {/* TOPBAR MOBILE */}
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
            <span className="text-xs ml-2 font-semibold" style={{ color: "rgba(255,255,255,0.4)" }}>Admin</span>
          </div>
          <div className="w-9" />
        </div>

        <main className="flex-1 overflow-x-hidden">
          <div className="p-4 md:p-6 max-w-7xl mx-auto">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
