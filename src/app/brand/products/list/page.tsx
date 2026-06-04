"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";
import { Package } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", {
    style: "currency", currency: "COP", maximumFractionDigits: 0,
  }).format(Number(n || 0));
}

export default function BrandProductsListPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState<any[]>([]);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function init() {
      setLoading(true); setErrorMsg(null);
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;
      if (!user) { router.push("/login"); return; }

      const { data: userData, error: userError } = await supabase
        .from("users").select("*").eq("auth_id", user.id).single();
      if (userError || !userData || userData.role !== "BRAND_ADMIN") { router.push("/login"); return; }

      const { data: brandData, error: brandError } = await supabase
        .from("brands").select("*").eq("id", userData.brand_id).single();
      if (brandError || !brandData) { router.push("/login"); return; }

      const { data, error } = await supabase
        .from("products")
        .select("*, product_brands(name, logo_url)")
        .eq("brand_id", brandData.id)
        .order("created_at", { ascending: false });

      if (error) { setErrorMsg("Error cargando productos: " + error.message); }
      else { setProducts(data || []); }
      setLoading(false);
    }
    init();
  }, [router]);

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
        style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>Catalogo</p>
          <h1 className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>Mis productos</h1>
          <p className="text-sm mt-1" style={{ color: "var(--nomi-muted)" }}>
            {products.length} producto{products.length !== 1 ? "s" : ""} registrados
          </p>
        </div>
        <button onClick={() => router.push("/brand/products")}
          className="px-4 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
          style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
          + Crear producto
        </button>
      </div>

      {errorMsg && (
        <div className="px-4 py-3 rounded-xl text-sm font-semibold"
          style={{ backgroundColor: "#FEE2E2", color: "#DC2626" }}>{errorMsg}</div>
      )}

      {products.length === 0 ? (
        <div className="bg-white rounded-2xl px-5 py-12 text-center"
          style={{ border: "1.5px solid var(--nomi-border)" }}>
          <Package className="w-10 h-10 mx-auto mb-3" style={{ color: "var(--nomi-border)" }} />
          <p className="text-sm font-semibold mb-4" style={{ color: "var(--nomi-muted)" }}>
            Aun no tienes productos creados
          </p>
          <button onClick={() => router.push("/brand/products")}
            className="px-5 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
            style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
            Crear primer producto
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {products.map((p) => {
            const img = Array.isArray(p.images) && p.images[0] ? p.images[0] : p.image_url;
            return (
              <div key={p.id} className="bg-white rounded-2xl overflow-hidden transition hover:shadow-md"
                style={{ border: "1.5px solid var(--nomi-border)" }}>
                {/* IMAGEN */}
                <div className="h-44 overflow-hidden" style={{ backgroundColor: "var(--nomi-gray)" }}>
                  {img
                    ? <img src={img} className="w-full h-full object-cover"
                        onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} alt={p.name} />
                    : <div className="w-full h-full flex items-center justify-center">
                        <Package className="w-12 h-12" style={{ color: "var(--nomi-border)" }} />
                      </div>}
                </div>

                <div className="p-4 space-y-2">
                  {/* LOGO MARCA */}
                  {p.product_brands?.logo_url && (
                    <img src={p.product_brands.logo_url}
                      className="h-6 object-contain rounded"
                      style={{ backgroundColor: "#fff" }} alt={p.product_brands.name} />
                  )}

                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="font-black text-sm" style={{ color: "var(--nomi-navy)" }}>
                        {p.name}
                      </div>
                      <div className="text-xs mt-0.5" style={{ color: "var(--nomi-muted)" }}>
                        {p.sku && <span>SKU: {p.sku} · </span>}
                        {p.category}
                      </div>
                    </div>
                    <span className="text-xs font-bold px-2 py-0.5 rounded-full shrink-0"
                      style={p.active
                        ? { backgroundColor: "var(--nomi-teal-bg)", color: "var(--nomi-teal)" }
                        : { backgroundColor: "#FEE2E2", color: "#DC2626" }}>
                      {p.active ? "Activo" : "Inactivo"}
                    </span>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <span className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>
                      {money(p.price)}
                    </span>
                    <span className="text-xs font-semibold" style={{ color: "var(--nomi-muted)" }}>
                      Stock: {Number(p.stock || 0)}
                    </span>
                  </div>

                  <button onClick={() => router.push(`/brand/products/${p.id}`)}
                    className="w-full py-2.5 rounded-xl text-sm font-bold cursor-pointer transition mt-1"
                    style={{ backgroundColor: "var(--nomi-gray)", color: "var(--nomi-navy)", border: "1.5px solid var(--nomi-border)" }}>
                    Editar producto
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
