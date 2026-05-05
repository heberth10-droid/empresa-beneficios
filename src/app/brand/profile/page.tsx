"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BrandProfilePage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [userData, setUserData] = useState<any>(null);

  useEffect(() => {
    async function loadProfile() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (error || !data) {
        router.push("/login");
        return;
      }

      setUserData(data);
      setLoading(false);
    }

    loadProfile();
  }, [router]);

  if (loading) {
    return <div className="p-10 text-slate-300">Cargando perfil…</div>;
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Mi perfil</h1>
        <p className="text-slate-400">
          Información con la que estás registrado en la plataforma.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-4">
        <div>
          <p className="text-xs text-slate-500">Nombre</p>
          <p className="text-lg text-white">{userData.name || "—"}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Correo</p>
          <p className="text-lg text-white">{userData.email || "—"}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">Rol</p>
          <p className="text-lg text-white">{userData.role}</p>
        </div>

        <div>
          <p className="text-xs text-slate-500">ID de marca</p>
          <p className="text-sm text-slate-300">{userData.brand_id}</p>
        </div>
      </div>
    </div>
  );
}