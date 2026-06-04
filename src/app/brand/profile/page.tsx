"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { User } from "lucide-react";

export default function BrandProfilePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("users").select("*").eq("auth_id", user.id).single();
      if (error || !data) { router.push("/login"); return; }

      setUserData(data);

      if (data.brand_id) {
        const { data: brandData } = await supabase
          .from("brands").select("*").eq("id", data.brand_id).single();
        setBrand(brandData);
      }

      setLoading(false);
    }
    loadProfile();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6 max-w-xl">
      <div>
        <p className="text-xs font-bold uppercase tracking-widest mb-1"
          style={{ color: "var(--nomi-teal)" }}>Cuenta</p>
        <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mi perfil</h1>
        <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
          Informacion con la que estas registrado en la plataforma
        </p>
      </div>

      {/* AVATAR */}
      <div className="flex items-center gap-4">
        <div className="w-16 h-16 rounded-2xl flex items-center justify-center"
          style={{ backgroundColor: "var(--nomi-navy)" }}>
          <User className="w-8 h-8 text-white" />
        </div>
        <div>
          <div className="font-black text-lg" style={{ color: "var(--nomi-navy)" }}>
            {userData?.name || "Sin nombre"}
          </div>
          <span className="text-xs font-bold px-2.5 py-1 rounded-full"
            style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
            {userData?.role}
          </span>
        </div>
      </div>

      {/* DATOS USUARIO */}
      <div className="bg-white rounded-2xl overflow-hidden"
        style={{ border: "1.5px solid var(--nomi-border)" }}>
        <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--nomi-border)" }}>
          <h2 className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Datos de cuenta</h2>
        </div>
        {[
          ["Nombre", userData?.name || "—"],
          ["Correo", userData?.email || "—"],
          ["Rol", userData?.role || "—"],
          ["ID de usuario", userData?.auth_id?.slice(0, 16) + "..." || "—"],
        ].map(([label, value]) => (
          <div key={String(label)} className="flex justify-between items-center px-5 py-3.5"
            style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <span className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>{label}</span>
            <span className="text-sm font-bold" style={{ color: "var(--nomi-navy)" }}>{String(value)}</span>
          </div>
        ))}
      </div>

      {/* DATOS MARCA */}
      {brand && (
        <div className="bg-white rounded-2xl overflow-hidden"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <div className="px-5 py-4" style={{ borderBottom: "1px solid var(--nomi-border)" }}>
            <h2 className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Datos de la marca</h2>
          </div>
          {[
            ["Nombre", brand.name || "—"],
            ["NIT", brand.nit || "—"],
            ["Estado", brand.active ? "Activa" : "Inactiva"],
          ].map(([label, value]) => (
            <div key={String(label)} className="flex justify-between items-center px-5 py-3.5"
              style={{ borderBottom: "1px solid var(--nomi-border)" }}>
              <span className="text-sm font-semibold" style={{ color: "var(--nomi-muted)" }}>{label}</span>
              <span className="text-sm font-bold" style={{ color: "var(--nomi-navy)" }}>{String(value)}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
