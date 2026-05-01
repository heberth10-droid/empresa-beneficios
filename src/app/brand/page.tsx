"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BrandDashboard() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);

  useEffect(() => {
    async function loadBrandDashboard() {
      // Obtener sesión
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      // Obtener datos del usuario desde la tabla USERS
      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (userError || !userData) {
        router.push("/login");
        return;
      }

      // Validar rol de marca
      if (userData.role !== "BRAND_ADMIN") {
        router.push("/login");
        return;
      }

      // Obtener marca a la cual pertenece
      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", userData.brand_id)
        .single();

      if (brandError) {
        router.push("/login");
        return;
      }

      setBrand(brandData);
      setLoading(false);
    }

    loadBrandDashboard();
  }, [router]);

  if (loading) {
    return <p className="text-slate-300 p-8">Cargando panel...</p>;
  }

  return (
    <div>
      <h1 className="text-2xl font-bold mb-4">Panel de Marca</h1>
      <p className="text-slate-300">Bienvenido, {brand?.name}</p>

      <p className="mt-4 text-sm text-slate-400">
        Maneja tus productos, pedidos y estadísticas desde este panel.
      </p>
    </div>
  );
}
