"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<"brand" | "company" | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [brandName, setBrandName] = useState("");
  const [brandNit, setBrandNit] = useState("");

  const [companyName, setCompanyName] = useState("");
  const [companyNit, setCompanyNit] = useState("");
  const [companySector, setCompanySector] = useState("");

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      // 1) Crear usuario en Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError || !authData.user) {
        setErrorMsg(authError?.message || "No fue posible crear el usuario (Auth).");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const roleToSave = role === "brand" ? "BRAND_ADMIN" : "COMPANY_ADMIN";

      // 2) Crear fila en users (tu tabla interna)
      const { error: userError } = await supabase.from("users").insert({
        auth_id: userId,
        role: roleToSave,
        name: role === "brand" ? brandName : companyName,
      });

      if (userError) {
        setErrorMsg("Error creando usuario interno (users): " + userError.message);
        setLoading(false);
        return;
      }

      // 3) Crear marca o empresa
      if (role === "brand") {
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .insert({
            name: brandName,
            nit: brandNit,
            admin_id: userId,
            active: true,
          })
          .select()
          .single();

        if (brandError || !brandData) {
          setErrorMsg("No se pudo crear la marca: " + (brandError?.message || "sin detalle"));
          setLoading(false);
          return;
        }

        // Guardar brand_id en users
        const { error: updErr } = await supabase
          .from("users")
          .update({ brand_id: brandData.id })
          .eq("auth_id", userId);

        if (updErr) {
          setErrorMsg("Marca creada, pero no se pudo asignar brand_id al usuario: " + updErr.message);
          setLoading(false);
          return;
        }

        // Login automático
        await supabase.auth.signInWithPassword({ email, password });

        router.push("/brand");
        setLoading(false);
        return;
      }

      if (role === "company") {
        const { data: companyData, error: companyError } = await supabase
          .from("companies")
          .insert({
            name: companyName,
            nit: companyNit,
            sector: companySector,
            admin_id: userId,
            active: true,
          })
          .select()
          .single();

        if (companyError || !companyData) {
          setErrorMsg("No se pudo crear la empresa: " + (companyError?.message || "sin detalle"));
          setLoading(false);
          return;
        }

        // Guardar company_id en users
        const { error: updErr } = await supabase
          .from("users")
          .update({ company_id: companyData.id })
          .eq("auth_id", userId);

        if (updErr) {
          setErrorMsg("Empresa creada, pero no se pudo asignar company_id al usuario: " + updErr.message);
          setLoading(false);
          return;
        }

        // Login automático
        await supabase.auth.signInWithPassword({ email, password });

        router.push("/company");
        setLoading(false);
        return;
      }

      setLoading(false);
    } catch (err: any) {
      setErrorMsg("Error inesperado: " + (err?.message || "desconocido"));
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-950 text-white">
      <div className="bg-slate-900 p-8 rounded-xl border border-slate-800 w-full max-w-lg">
        <h1 className="text-2xl font-bold mb-6 text-center">Crear una cuenta</h1>

        {!role && (
          <div className="space-y-6">
            <button
              className="w-full bg-emerald-500 text-slate-900 font-semibold py-3 rounded-lg hover:bg-emerald-400 transition"
              onClick={() => setRole("brand")}
            >
              Soy una Marca
            </button>

            <button
              className="w-full bg-blue-500 text-white font-semibold py-3 rounded-lg hover:bg-blue-400 transition"
              onClick={() => setRole("company")}
            >
              Soy una Empresa
            </button>
          </div>
        )}

        {role && (
          <form onSubmit={handleRegister} className="space-y-4 mt-6">
            {role === "brand" && (
              <>
                <input
                  placeholder="Nombre de la Marca"
                  className="w-full bg-slate-800 p-3 rounded"
                  value={brandName}
                  onChange={(e) => setBrandName(e.target.value)}
                />
                <input
                  placeholder="NIT"
                  className="w-full bg-slate-800 p-3 rounded"
                  value={brandNit}
                  onChange={(e) => setBrandNit(e.target.value)}
                />
              </>
            )}

            {role === "company" && (
              <>
                <input
                  placeholder="Nombre de la Empresa"
                  className="w-full bg-slate-800 p-3 rounded"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                />
                <input
                  placeholder="NIT"
                  className="w-full bg-slate-800 p-3 rounded"
                  value={companyNit}
                  onChange={(e) => setCompanyNit(e.target.value)}
                />
                <input
                  placeholder="Sector"
                  className="w-full bg-slate-800 p-3 rounded"
                  value={companySector}
                  onChange={(e) => setCompanySector(e.target.value)}
                />
              </>
            )}

            <hr className="border-slate-700 my-4" />

            <input
              type="email"
              placeholder="Correo"
              className="w-full bg-slate-800 p-3 rounded"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />

            <input
              type="password"
              placeholder="Contraseña"
              className="w-full bg-slate-800 p-3 rounded"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />

            {errorMsg && <p className="text-red-400 text-sm">{errorMsg}</p>}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-emerald-500 p-3 rounded font-semibold text-slate-900 hover:bg-emerald-400 transition disabled:opacity-50"
            >
              {loading ? "Creando cuenta..." : "Crear cuenta"}
            </button>

            <button
              type="button"
              onClick={() => setRole(null)}
              className="w-full text-slate-400 text-sm mt-2 hover:text-white"
            >
              ← Elegir otro tipo de cuenta
            </button>
          </form>
        )}
      </div>
    </div>
  );
}