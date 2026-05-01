"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BrandsPage() {
  const router = useRouter();

  const [brands, setBrands] = useState<any[]>([]);
  const [newBrandName, setNewBrandName] = useState("");
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Verificación de SUPER_ADMIN
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

  // Cargar marcas
  useEffect(() => {
    async function loadBrands() {
      const { data, error } = await supabase
        .from("brands")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) setErrorMsg(error.message);
      setBrands(data || []);
      setLoading(false);
    }

    loadBrands();
  }, []);

  async function createBrand(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    if (!newBrandName.trim()) {
      setErrorMsg("El nombre de la marca es obligatorio.");
      return;
    }

    const { data, error } = await supabase
      .from("brands")
      .insert({
        name: newBrandName.trim(),
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

  async function toggleBrand(id: string, currentActive: boolean) {
    const { data, error } = await supabase
      .from("brands")
      .update({ active: !currentActive })
      .eq("id", id)
      .select("*")
      .single();

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setBrands((prev) =>
      prev.map((b) => (b.id === id ? data : b))
    );
  }

  async function deleteBrand(id: string) {
    if (!confirm("¿Eliminar marca?")) return;

    const { error } = await supabase
      .from("brands")
      .delete()
      .eq("id", id);

    if (error) {
      setErrorMsg(error.message);
      return;
    }

    setBrands((prev) => prev.filter((b) => b.id !== id));
  }

  if (loading) return <p>Cargando marcas...</p>;

  return (
    <div>
      <h1 className="text-2xl font-bold mb-6">Marcas</h1>

      {errorMsg && (
        <p className="mb-4 text-red-400 text-sm">{errorMsg}</p>
      )}

      {/* Crear marca */}
      <form onSubmit={createBrand} className="space-y-3 mb-8 max-w-md">
        <input
          className="bg-slate-900 border border-slate-700 p-2 rounded w-full"
          placeholder="Nombre de la marca"
          value={newBrandName}
          onChange={(e) => setNewBrandName(e.target.value)}
        />
        <button className="bg-emerald-500 px-4 py-2 rounded text-slate-900 font-semibold">
          Crear marca
        </button>
      </form>

      {/* Listado */}
      <ul className="space-y-2 text-sm">
        {brands.map((b) => (
          <li
            key={b.id}
            className="flex justify-between items-center border-b border-slate-800 pb-2"
          >
            <div>
              <div className="font-medium">{b.name}</div>
              <div
                className={
                  b.active ? "text-emerald-400 text-xs" : "text-yellow-400 text-xs"
                }
              >
                {b.active ? "Activa" : "Inactiva"}
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => toggleBrand(b.id, b.active)}
                className="text-blue-300 hover:text-blue-100"
              >
                {b.active ? "Desactivar" : "Activar"}
              </button>

              <button
                onClick={() => deleteBrand(b.id)}
                className="text-red-400 hover:text-red-200"
              >
                Eliminar
              </button>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
