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

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: row } = await supabase
        .from("users")
        .select("role")
        .eq("auth_id", user.id)
        .single();

      if (!row || row.role !== "SUPER_ADMIN") {
        router.push("/login");
        return;
      }

      setLoading(false);
    }

    validate();
  }, [router]);

  if (loading) return <div className="p-10 text-slate-300">Cargando súper admin...</div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white flex">
      <AdminSidebar />
      <main className="flex-1 p-6 overflow-x-hidden">{children}</main>
    </div>
  );
}
