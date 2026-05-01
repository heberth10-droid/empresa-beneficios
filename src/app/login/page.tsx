"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    // Login Auth
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error || !data.user) {
      setErrorMsg(error?.message || "Error al iniciar sesión");
      setLoading(false);
      return;
    }
console.log("✅ ACCESS TOKEN DIRECTO:", data.session?.access_token);
    const userId = data.user.id;

    // Obtener rol desde USERS
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("*")
      .eq("auth_id", userId)
      .single();

    if (userError || !userData) {
      setErrorMsg("No se pudo encontrar la información del usuario.");
      setLoading(false);
      return;
    }

    setLoading(false);

    switch (userData.role) {
      case "SUPER_ADMIN":
        router.push("/admin");
        break;
      case "BRAND_ADMIN":
        router.push("/brand");
        break;
      case "COMPANY_ADMIN":
        router.push("/company");
        break;
      case "EMPLOYEE":
        router.push("/employee");
        break;
      default:
        setErrorMsg("Rol desconocido");
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 w-full max-w-md">

        <h1 className="text-2xl font-bold mb-6 text-center">Iniciar sesión</h1>

        {errorMsg && (
          <p className="bg-red-500/20 text-red-300 p-2 rounded mb-4 text-sm">
            {errorMsg}
          </p>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <input
            type="email"
            placeholder="Correo"
            className="w-full px-4 py-2 bg-slate-800 rounded text-sm"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <input
            type="password"
            placeholder="Contraseña"
            className="w-full px-4 py-2 bg-slate-800 rounded text-sm"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-emerald-500 py-2 rounded font-semibold text-slate-900 hover:bg-emerald-400 transition text-sm disabled:opacity-60"
          >
            {loading ? "Ingresando..." : "Entrar"}
          </button>
        </form>

        <div className="text-center mt-4">
          <p className="text-slate-400 text-sm">
            ¿No tienes cuenta?
            <br />
            <a
              href="/register"
              className="text-emerald-400 hover:text-emerald-300 font-semibold"
            >
              Regístrate aquí
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
