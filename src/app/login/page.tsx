"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleLogin(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });

    if (error || !data.user) {
      setErrorMsg(error?.message || "Error al iniciar sesión");
      setLoading(false);
      return;
    }

    console.log("✅ ACCESS TOKEN DIRECTO:", data.session?.access_token);
    const userId = data.user.id;

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
      case "SUPER_ADMIN":   router.push("/admin");    break;
      case "BRAND_ADMIN":   router.push("/brand");    break;
      case "COMPANY_ADMIN": router.push("/company");  break;
      case "EMPLOYEE":      router.push("/employee"); break;
      default: setErrorMsg("Rol desconocido");
    }
  }

  return (
    <div className="min-h-screen flex flex-col"
      style={{ backgroundColor: "var(--nomi-gray)" }}>

      {/* TOP BAR */}
      <div className="w-full py-4 px-6 flex items-center justify-between"
        style={{ backgroundColor: "var(--nomi-navy)" }}>
        <Link href="/market" className="flex items-center">
          <span className="text-xl font-black text-white">N</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black mx-0.5"
            style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
          <span className="text-xl font-black text-white">MI</span>
        </Link>
        <Link href="/market" className="text-xs font-semibold"
          style={{ color: "rgba(255,255,255,0.6)" }}>
          ← Volver al marketplace
        </Link>
      </div>

      {/* CARD */}
      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-md">

          {/* HEADER */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl mb-4"
              style={{ backgroundColor: "var(--nomi-navy)" }}>
              <span className="text-2xl font-black text-white">N</span>
              <span className="inline-flex items-center justify-center w-5 h-5 rounded-full border-2 text-xs font-black mx-0.5"
                style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
              <span className="text-2xl font-black text-white">MI</span>
            </div>
            <h1 className="text-2xl font-black mb-1" style={{ color: "var(--nomi-navy)" }}>
              Bienvenido de vuelta
            </h1>
            <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>
              Ingresa a tu cuenta para seguir comprando sin intereses
            </p>
          </div>

          {/* FORM */}
          <div className="bg-white rounded-2xl p-8 shadow-sm"
            style={{ border: "1.5px solid var(--nomi-border)" }}>

            {errorMsg && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleLogin} className="space-y-4">

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>
                  Correo electrónico
                </label>
                <input
                  type="email"
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full px-4 py-3 rounded-xl text-sm outline-none transition"
                  style={{
                    border: "1.5px solid var(--nomi-border)",
                    color: "var(--nomi-navy)",
                    backgroundColor: "var(--nomi-gray)",
                  }}
                />
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                  style={{ color: "var(--nomi-navy)" }}>
                  Contraseña
                </label>
                <div className="relative">
                  <input
                    type={showPass ? "text" : "password"}
                    placeholder="••••••••"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    required
                    className="w-full px-4 py-3 pr-12 rounded-xl text-sm outline-none transition"
                    style={{
                      border: "1.5px solid var(--nomi-border)",
                      color: "var(--nomi-navy)",
                      backgroundColor: "var(--nomi-gray)",
                    }}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold cursor-pointer"
                    style={{ color: "var(--nomi-muted)" }}>
                    {showPass ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl text-sm font-black transition cursor-pointer disabled:opacity-60"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                {loading ? "Ingresando..." : "Entrar a mi cuenta"}
              </button>
            </form>

            {/* DIVIDER */}
            <div className="flex items-center gap-3 my-5">
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--nomi-border)" }} />
              <span className="text-xs" style={{ color: "var(--nomi-muted)" }}>¿No tienes cuenta?</span>
              <div className="flex-1 h-px" style={{ backgroundColor: "var(--nomi-border)" }} />
            </div>

            <Link href="/register"
              className="block w-full py-3 rounded-xl text-sm font-bold text-center transition"
              style={{ border: "1.5px solid var(--nomi-navy)", color: "var(--nomi-navy)" }}>
              Crear una cuenta gratis
            </Link>
          </div>

          {/* TRUST */}
          <div className="flex items-center justify-center gap-4 mt-6 flex-wrap">
            {["🔒 Acceso seguro", "0% intereses", "Sin trámites"].map((t) => (
              <span key={t} className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>
                {t}
              </span>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
