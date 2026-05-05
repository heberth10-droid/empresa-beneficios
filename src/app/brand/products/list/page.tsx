"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

export default function BrandProductsListPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true);
      setErrorMsg(null);

      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData, error: userError } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (userError || !userData || userData.role !== "BRAND_ADMIN") {
        router.push("/login");
        return;
      }

      const { data: brandData, error: brandError } = await supabase
        .from("brands")
        .select("*")
        .eq("id", userData.brand_id)
        .single();

      if (brandError || !brandData) {
        router.push("/login");
        return;
      }

      setBrand(brandData);
      await loadProducts(brandData.id);
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadProducts(brandId: string) {
    const { data, error } = await supabase
      .from("products")
      .select("*, product_brands(name, logo_url)")
      .eq("brand_id", brandId)
      .order("created_at", { ascending: false });

    if (error) {
      setErrorMsg(error.message);
      setProducts([]);
      return;
    }

    setProducts(data || []);
  }

  if (loading || !brand) {
    return (
      <div className="p-10 text-slate-300">
        Cargando listado de productos…
      </div>
    );
  }

  return (
    <div className="space-y-8 p-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">Listado de productos</h1>
          <p className="text-slate-400">
            Productos creados por {brand.name}. Desde aquí puedes entrar a editar,
            activar o desactivar productos.
          </p>
        </div>

        <button
          onClick={() => router.push("/brand/products")}
          className="px-5 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm"
        >
          Crear nuevo producto
        </button>
      </div>

      {errorMsg && (
        <div className="bg-red-500/15 border border-red-500/30 text-red-200 rounded p-3 text-sm">
          {errorMsg}
        </div>
      )}

      {products.length === 0 ? (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <p className="text-slate-300">Aún no tienes productos creados.</p>
          <button
            onClick={() => router.push("/brand/products")}
            className="mt-4 px-5 py-3 rounded bg-emerald-500 hover:bg-emerald-400 text-black font-bold text-sm"
          >
            Crear primer producto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {products.map((p) => (
            <div
              key={p.id}
              className="bg-slate-900 border border-slate-800 p-4 rounded-lg"
            >
              {p.images && p.images.length > 0 ? (
                <img
                  src={p.images[0]}
                  className="w-full h-40 object-cover rounded mb-3"
                  alt={p.name}
                />
              ) : (
                <div className="w-full h-40 rounded mb-3 bg-slate-800 flex items-center justify-center text-slate-500 text-sm">
                  Sin imagen
                </div>
              )}

              {p.product_brands?.logo_url && (
                <img
                  src={p.product_brands.logo_url}
                  className="h-8 object-contain bg-white rounded px-2 py-1 mb-2"
                  alt={p.product_brands.name}
                />
              )}

              <div className="flex items-start justify-between gap-3">
                <div>
                  <h2 className="text-lg font-bold text-white">{p.name}</h2>
                  <p className="text-sm text-slate-400">{p.sku}</p>
                </div>

                <span
                  className={[
                    "text-xs px-2 py-1 rounded-full font-bold",
                    p.active
                      ? "bg-emerald-500/15 text-emerald-300"
                      : "bg-red-500/15 text-red-300",
                  ].join(" ")}
                >
                  {p.active ? "Activo" : "Inactivo"}
                </span>
              </div>

              {p.product_brands?.name && (
                <p className="text-xs text-slate-500 mt-2">
                  Marca: {p.product_brands.name}
                </p>
              )}

              {p.category && (
                <p className="text-xs text-slate-500 mt-1">
                  Categoría: {p.category}
                </p>
              )}

              {p.subcategory && (
                <p className="text-xs text-slate-500 mt-1">
                  Subcategoría: {p.subcategory}
                </p>
              )}

              <div className="mt-3 flex items-center justify-between">
                <p className="text-emerald-400 text-lg font-bold">
                  ${Number(p.price || 0).toLocaleString("es-CO")}
                </p>

                <p className="text-xs text-slate-400">
                  Stock: {Number(p.stock || 0)}
                </p>
              </div>

              <button
                type="button"
                onClick={() => router.push(`/brand/products/${p.id}`)}
                className="mt-4 w-full px-4 py-2 rounded bg-slate-800 hover:bg-slate-700 text-sm font-semibold"
              >
                Editar producto
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}