"use client";

import { useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import Link from "next/link";

export default function RegisterPage() {
  const router = useRouter();

  const [role, setRole] = useState<"brand" | "company" | null>(null);
  const [brandType, setBrandType] = useState<"PRODUCTS" | "COURSES" | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [brandName, setBrandName] = useState("");
  const [brandNit, setBrandNit] = useState("");
  const [companyName, setCompanyName] = useState("");
  const [companyNit, setCompanyNit] = useState("");
  const [companySector, setCompanySector] = useState("");
  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);

  async function handleRegister(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);

    try {
      const { data: authData, error: authError } = await supabase.auth.signUp({ email, password });

      if (authError || !authData.user) {
        setErrorMsg(authError?.message || "No fue posible crear el usuario.");
        setLoading(false);
        return;
      }

      const userId = authData.user.id;
      const roleToSave = role === "brand" ? "BRAND_ADMIN" : "COMPANY_ADMIN";

      const { error: userError } = await supabase.from("users").insert({
        auth_id: userId,
        role: roleToSave,
        name: role === "brand" ? brandName : companyName,
      });

      if (userError) {
        setErrorMsg("Error creando usuario: " + userError.message);
        setLoading(false);
        return;
      }

      if (role === "brand") {
        const { data: brandData, error: brandError } = await supabase
          .from("brands")
          .insert({
            name: brandName,
            nit: brandNit,
            admin_id: userId,
            active: true,
            brand_type: brandType || "PRODUCTS",
          })
          .select()
          .single();

        if (brandError || !brandData) {
          setErrorMsg("No se pudo crear la marca: " + (brandError?.message || "sin detalle"));
          setLoading(false);
          return;
        }

        const { error: updErr } = await supabase
          .from("users").update({ brand_id: brandData.id }).eq("auth_id", userId);

        if (updErr) {
          setErrorMsg("Marca creada, pero no se pudo asignar brand_id: " + updErr.message);
          setLoading(false);
          return;
        }

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

        const { error: updErr } = await supabase
          .from("users").update({ company_id: companyData.id }).eq("auth_id", userId);

        if (updErr) {
          setErrorMsg("Empresa creada, pero no se pudo asignar company_id: " + updErr.message);
          setLoading(false);
          return;
        }

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

  const inputClass = "w-full px-4 py-3 rounded-xl text-sm outline-none transition";
  const inputStyle = {
    border: "1.5px solid var(--nomi-border)",
    color: "var(--nomi-navy)",
    backgroundColor: "var(--nomi-gray)",
  };

  return (
    <div className="min-h-screen flex flex-col" style={{ backgroundColor: "var(--nomi-gray)" }}>

      <div className="w-full py-4 px-6 flex items-center justify-between"
        style={{ backgroundColor: "var(--nomi-navy)" }}>
        <Link href="/market" className="flex items-center">
          <span className="text-xl font-black text-white">N</span>
          <span className="inline-flex items-center justify-center w-6 h-6 rounded-full border-2 text-xs font-black mx-0.5"
            style={{ borderColor: "var(--nomi-orange)", color: "var(--nomi-teal)" }}>$</span>
          <span className="text-xl font-black text-white">MI</span>
        </Link>
        <Link href="/login" className="text-xs font-semibold"
          style={{ color: "rgba(255,255,255,0.6)" }}>
          ¿Ya tienes cuenta? Inicia sesion →
        </Link>
      </div>

      <div className="flex-1 flex items-center justify-center px-4 py-12">
        <div className="w-full max-w-lg">

          <div className="text-center mb-8">
            <h1 className="text-2xl font-black mb-1" style={{ color: "var(--nomi-navy)" }}>
              Crear una cuenta
            </h1>
            <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>
              Unete a NOMI y empieza a comprar sin intereses
            </p>
          </div>

          <div className="bg-white rounded-2xl p-8 shadow-sm"
            style={{ border: "1.5px solid var(--nomi-border)" }}>

            {errorMsg && (
              <div className="mb-5 px-4 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: "#FEF2F2", color: "#DC2626", border: "1px solid #FECACA" }}>
                {errorMsg}
              </div>
            )}

            {/* PASO 1 — Elegir rol */}
            {!role && (
              <div className="space-y-4">
                <p className="text-sm font-bold text-center mb-6" style={{ color: "var(--nomi-muted)" }}>
                  Como quieres registrarte?
                </p>
                <button onClick={() => setRole("brand")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition cursor-pointer text-left"
                  style={{ border: "1.5px solid var(--nomi-border)", backgroundColor: "var(--nomi-gray)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--nomi-orange-bg)" }}>
                    <span className="text-xl">🏷️</span>
                  </div>
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Soy una Marca o Proveedor</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>Quiero vender en NOMI</div>
                  </div>
                </button>
                <button onClick={() => setRole("company")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition cursor-pointer text-left"
                  style={{ border: "1.5px solid var(--nomi-border)", backgroundColor: "var(--nomi-gray)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--nomi-teal-bg)" }}>
                    <span className="text-xl">🏢</span>
                  </div>
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Soy una Empresa</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>Quiero dar este beneficio a mis empleados</div>
                  </div>
                </button>
              </div>
            )}

            {/* PASO 2 — Elegir tipo si es marca */}
            {role === "brand" && !brandType && (
              <div className="space-y-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs px-3 py-1.5 rounded-full font-bold"
                    style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
                    🏷️ Marca / Proveedor
                  </span>
                  <button type="button" onClick={() => setRole(null)}
                    className="text-xs font-semibold cursor-pointer" style={{ color: "var(--nomi-muted)" }}>
                    Cambiar tipo →
                  </button>
                </div>
                <p className="text-sm font-bold text-center mb-2" style={{ color: "var(--nomi-muted)" }}>
                  Que vas a ofrecer en NOMI?
                </p>
                <button onClick={() => setBrandType("PRODUCTS")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition cursor-pointer text-left"
                  style={{ border: "1.5px solid var(--nomi-border)", backgroundColor: "var(--nomi-gray)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "var(--nomi-orange-bg)" }}>
                    <span className="text-xl">📦</span>
                  </div>
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Productos fisicos o digitales</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>Ropa, electronica, cosmeticos, suplementos, etc.</div>
                  </div>
                </button>
                <button onClick={() => setBrandType("COURSES")}
                  className="w-full flex items-center gap-4 p-4 rounded-xl transition cursor-pointer text-left"
                  style={{ border: "1.5px solid var(--nomi-border)", backgroundColor: "var(--nomi-gray)" }}>
                  <div className="w-12 h-12 rounded-xl flex items-center justify-center shrink-0"
                    style={{ backgroundColor: "#EDE9FE" }}>
                    <span className="text-xl">🎓</span>
                  </div>
                  <div>
                    <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>Cursos y formacion</div>
                    <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>Cursos online, talleres, certificaciones, etc.</div>
                  </div>
                </button>
              </div>
            )}

            {/* PASO 3 — Formulario */}
            {role && (role === "company" || brandType) && (
              <form onSubmit={handleRegister} className="space-y-4">

                <div className="flex items-center justify-between mb-2">
                  <div className="flex gap-2">
                    <span className="text-xs px-3 py-1.5 rounded-full font-bold"
                      style={{
                        backgroundColor: role === "brand" ? "var(--nomi-orange-bg)" : "var(--nomi-teal-bg)",
                        color: role === "brand" ? "var(--nomi-orange)" : "var(--nomi-teal)",
                      }}>
                      {role === "brand" ? "🏷️ Marca" : "🏢 Empresa"}
                    </span>
                    {role === "brand" && brandType && (
                      <span className="text-xs px-3 py-1.5 rounded-full font-bold"
                        style={{
                          backgroundColor: brandType === "COURSES" ? "#EDE9FE" : "var(--nomi-gray)",
                          color: brandType === "COURSES" ? "#8B5CF6" : "var(--nomi-navy)",
                          border: "1.5px solid var(--nomi-border)",
                        }}>
                        {brandType === "COURSES" ? "🎓 Cursos" : "📦 Productos"}
                      </span>
                    )}
                  </div>
                  <button type="button"
                    onClick={() => { if (role === "brand") setBrandType(null); else setRole(null); }}
                    className="text-xs font-semibold cursor-pointer" style={{ color: "var(--nomi-muted)" }}>
                    Cambiar →
                  </button>
                </div>

                {role === "brand" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                        style={{ color: "var(--nomi-navy)" }}>
                        Nombre de la {brandType === "COURSES" ? "institucion / proveedor" : "marca"}
                      </label>
                      <input placeholder={brandType === "COURSES" ? "Ej: Academia Digital Pro" : "Ej: Samsung Colombia"}
                        className={inputClass} style={inputStyle}
                        value={brandName} onChange={(e) => setBrandName(e.target.value)} required />
                    </div>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                        style={{ color: "var(--nomi-navy)" }}>NIT</label>
                      <input placeholder="900.123.456-7" className={inputClass} style={inputStyle}
                        value={brandNit} onChange={(e) => setBrandNit(e.target.value)} />
                    </div>
                  </>
                )}

                {role === "company" && (
                  <>
                    <div>
                      <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                        style={{ color: "var(--nomi-navy)" }}>Nombre de la Empresa</label>
                      <input placeholder="Ej: Carvajal S.A." className={inputClass} style={inputStyle}
                        value={companyName} onChange={(e) => setCompanyName(e.target.value)} required />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                          style={{ color: "var(--nomi-navy)" }}>NIT</label>
                        <input placeholder="900.123.456-7" className={inputClass} style={inputStyle}
                          value={companyNit} onChange={(e) => setCompanyNit(e.target.value)} />
                      </div>
                      <div>
                        <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                          style={{ color: "var(--nomi-navy)" }}>Sector</label>
                        <input placeholder="Tecnologia" className={inputClass} style={inputStyle}
                          value={companySector} onChange={(e) => setCompanySector(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}

                <div className="h-px my-2" style={{ backgroundColor: "var(--nomi-border)" }} />

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--nomi-navy)" }}>Correo electronico</label>
                  <input type="email" placeholder="tu@correo.com" className={inputClass} style={inputStyle}
                    value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>

                <div>
                  <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide"
                    style={{ color: "var(--nomi-navy)" }}>Contrasena</label>
                  <div className="relative">
                    <input type={showPass ? "text" : "password"} placeholder="Minimo 6 caracteres"
                      className={inputClass} style={{ ...inputStyle, paddingRight: "3.5rem" }}
                      value={password} onChange={(e) => setPassword(e.target.value)} required />
                    <button type="button" onClick={() => setShowPass((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-xs font-semibold cursor-pointer"
                      style={{ color: "var(--nomi-muted)" }}>
                      {showPass ? "Ocultar" : "Ver"}
                    </button>
                  </div>
                </div>

                <button type="submit" disabled={loading}
                  className="w-full py-3 rounded-xl text-sm font-black transition cursor-pointer disabled:opacity-60"
                  style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                  {loading ? "Creando cuenta..." : "Crear cuenta gratis"}
                </button>
              </form>
            )}
          </div>

          <div className="text-center mt-5">
            <span className="text-xs" style={{ color: "var(--nomi-muted)" }}>
              Ya tienes cuenta?{" "}
              <Link href="/login" className="font-bold" style={{ color: "var(--nomi-orange)" }}>
                Inicia sesion aqui
              </Link>
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
