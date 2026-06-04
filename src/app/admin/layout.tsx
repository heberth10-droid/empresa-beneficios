"use client";

import { ReactNode, useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import AdminSidebar from "./components/AdminSidebar";

export default function AdminLayout({ children }: { children: ReactNode }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);

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
      <AdminSidebar />
      <main className="flex-1 overflow-x-hidden">
        <div className="p-6 max-w-7xl mx-auto">
          {children}
        </div>
      </main>
    </div>
  );
}
