"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function CompaniesPage() {
  const [companies, setCompanies] = useState<any[]>([]);
  const [newCompanyName, setNewCompanyName] = useState("");
  const [newCompanyNit, setNewCompanyNit] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  const router = useRouter();

  // Validación SUPER_ADMIN
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
    }

    checkRole();
  }, [router]);

  // Cargar empresas
  useEffect(() => {
    async function loadCompanies() {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setErrorMsg(error.message);
      setCompanies(data || []);
      setLoading(false);
    }

    loadCompanies();
  }, []);

  async function createCompany(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const { data, error } = await supabase
      .from("companies")
      .insert({
        name: newCompanyName.trim(),
        nit: newCompanyNit.trim(),
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

  async function deleteCompany(id: string) {
    if (!confirm("¿Eliminar empresa?")) return;

    const { error } = await supabase
      .from("companies")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setCompanies((prev) => prev.filter((c) => c.id !== id));
  }

  if (loading) return <p>Cargando empresas...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Empresas</h1>

      {errorMsg && (
        <p className="mb-4 text-red-400 text-sm">{errorMsg}</p>
      )}

      <form onSubmit={createCompany} className="space-y-3 mb-8 max-w-md">
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
        <button className="bg-emerald-500 px-4 py-2 rounded text-slate-900 font-semibold">
          Crear empresa
        </button>
      </form>

      <ul className="space-y-2">
        {companies.map((c) => (
          <li
            key={c.id}
            className="flex justify-between items-center border-b border-slate-800 pb-2"
          >
            <span>{c.name}</span>
            <button
              onClick={() => deleteCompany(c.id)}
              className="text-red-400 text-sm hover:text-red-200"
            >
              Eliminar
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
