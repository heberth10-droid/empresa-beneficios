"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

type Company = {
  id: string;
  name: string;
  nit: string | null;
};

type Brand = {
  id: string;
  name: string;
  active: boolean;
};

export default function AdminPage() {
  const router = useRouter();

  const [checkingRole, setCheckingRole] = useState(true);
  const [loading, setLoading] = useState(true);

  const [companies, setCompanies] = useState<Company[]>([]);
  const [brands, setBrands] = useState<Brand[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyNit, setNewCompanyNit] = useState("");
  const [newBrandName, setNewBrandName] = useState("");

  // Validar rol
  useEffect(() => {
    async function checkRole() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: profile } = await supabase
        .from("profiles")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!profile || profile.role !== "SUPER_ADMIN") {
        router.push("/login");
        return;
      }

      setCheckingRole(false);
    }

    checkRole();
  }, [router]);

  // Cargar datos
  useEffect(() => {
    if (checkingRole) return;

    async function loadData() {
      setLoading(true);

      const { data: companiesData } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      const { data: brandsData } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      setCompanies(companiesData || []);
      setBrands(brandsData || []);
      setLoading(false);
    }

    loadData();
  }, [checkingRole]);

  // Crear empresa
  async function createCompany(e: any) {
    e.preventDefault();

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: newCompanyName,
        nit: newCompanyNit || null,
      })
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setCompanies((prev) => [data, ...prev]);
    setNewCompanyName("");
    setNewCompanyNit("");
  }

  // Crear marca
  async function createBrand(e: any) {
    e.preventDefault();

    const { data, error } = await supabase
      .from("brands")
      .insert({
        name: newBrandName,
        active: true,
      })
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setBrands((prev) => [data, ...prev]);
    setNewBrandName("");
  }

  // Eliminar empresa
  async function deleteCompany(id: string) {
    if (!confirm("¿Eliminar esta empresa?")) return;

    await supabase.from("companies").delete().eq("id", id);
    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  // Eliminar marca
  async function deleteBrand(id: string) {
    if (!confirm("¿Eliminar esta marca?")) return;

    await supabase.from("brands").delete().eq("id", id);
    setBrands((prev) => prev.filter((b) => b.id !== id));
  }

  // Activar / desactivar marca
  async function toggleBrand(id: string, current: boolean) {
    const { data } = await supabase
      .from("brands")
      .update({ active: !current })
      .eq("id", id)
      .select("*")
      .single();

    setBrands((prev) => prev.map((b) => (b.id === id ? data : b)));
  }

  if (checkingRole)
    return (
      <p style={{ padding: 40, color: "white" }}>Verificando permisos...</p>
    );

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100">
      <div className="max-w-6xl mx-auto py-10 px-4">
        <h1 className="text-3xl font-bold mb-10">Panel Super Admin</h1>

        {/* GRID DE DOS COLUMNAS */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-10">

          {/* --- COLUMNA IZQUIERDA: EMPRESAS --- */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Crear empresa</h2>
            <form onSubmit={createCompany} className="space-y-3 mb-6">
              <input
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
                placeholder="Nombre"
                value={newCompanyName}
                onChange={(e) => setNewCompanyName(e.target.value)}
              />
              <input
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
                placeholder="NIT"
                value={newCompanyNit}
                onChange={(e) => setNewCompanyNit(e.target.value)}
              />
              <button className="bg-emerald-500 px-4 py-2 rounded text-slate-900 font-semibold w-full">
                Guardar empresa
              </button>
            </form>

            <h2 className="text-xl font-semibold mb-3">Empresas registradas</h2>
            <ul className="space-y-2">
              {companies.map((c) => (
                <li
                  key={c.id}
                  className="flex justify-between items-center border-b border-slate-800 pb-2"
                >
                  <span>{c.name}</span>
                  <button
                    onClick={() => deleteCompany(c.id)}
                    className="text-red-400 hover:text-red-200 text-sm"
                  >
                    Eliminar
                  </button>
                </li>
              ))}
            </ul>
          </div>

          {/* --- COLUMNA DERECHA: MARCAS --- */}
          <div>
            <h2 className="text-xl font-semibold mb-4">Crear marca</h2>
            <form onSubmit={createBrand} className="space-y-3 mb-6">
              <input
                className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
                placeholder="Nombre"
                value={newBrandName}
                onChange={(e) => setNewBrandName(e.target.value)}
              />
              <button className="bg-emerald-500 px-4 py-2 rounded text-slate-900 font-semibold w-full">
                Guardar marca
              </button>
            </form>

            <h2 className="text-xl font-semibold mb-3">Marcas registradas</h2>
            <ul className="space-y-2">
              {brands.map((b) => (
                <li
                  key={b.id}
                  className="flex justify-between items-center border-b border-slate-800 pb-2"
                >
                  <span>
                    {b.name} —{" "}
                    <span
                      className={
                        b.active ? "text-emerald-400" : "text-yellow-400"
                      }
                    >
                      {b.active ? "Activa" : "Inactiva"}
                    </span>
                  </span>

                  <div className="space-x-3">
                    <button
                      onClick={() => toggleBrand(b.id, b.active)}
                      className="text-blue-300 hover:text-blue-100 text-sm"
                    >
                      {b.active ? "Desactivar" : "Activar"}
                    </button>
                    <button
                      onClick={() => deleteBrand(b.id)}
                      className="text-red-400 hover:text-red-200 text-sm"
                    >
                      Eliminar
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          </div>

        </div>
      </div>
    </div>
  );
}
