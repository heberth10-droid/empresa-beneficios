"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter } from "next/navigation";

const BRAND_LOGO_BUCKET = "product-brand-logos";

export default function ProductBrandsPage() {
  const router = useRouter();

  const [loading, setLoading] = useState(true);
  const [brand, setBrand] = useState<any>(null);
  const [productBrands, setProductBrands] = useState<any[]>([]);

  const [name, setName] = useState("");
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [previewLogo, setPreviewLogo] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function init() {
      const { data: authData } = await supabase.auth.getUser();
      const user = authData?.user;

      if (!user) {
        router.push("/login");
        return;
      }

      const { data: userData } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!userData || userData.role !== "BRAND_ADMIN") {
        router.push("/login");
        return;
      }

      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("id", userData.brand_id)
        .single();

      if (!brandData) {
        router.push("/login");
        return;
      }

      setBrand(brandData);
      await loadProductBrands(brandData.id);
      setLoading(false);
    }

    init();
  }, [router]);

  async function loadProductBrands(brandId: string) {
    const { data, error } = await supabase
      .from("product_brands")
      .select("*")
      .eq("seller_brand_id", brandId)
      .eq("active", true)
      .order("name", { ascending: true });

    if (error) {
      console.error(error);
      setProductBrands([]);
      return;
    }

    setProductBrands(data || []);
  }

  async function uploadLogo(productBrandId: string, file: File) {
    const ext = file.name.split(".").pop();
    const fileName = `${Date.now()}-${Math.random().toString(36)}.${ext}`;
    const filePath = `${brand.id}/${productBrandId}/${fileName}`;

    const { error } = await supabase.storage
      .from(BRAND_LOGO_BUCKET)
      .upload(filePath, file, {
        contentType: file.type,
        cacheControl: "3600",
        upsert: true,
      });

    if (error) {
      throw new Error("No se pudo subir el logo: " + error.message);
    }

    return supabase.storage
      .from(BRAND_LOGO_BUCKET)
      .getPublicUrl(filePath).data.publicUrl;
  }

  async function handleCreateBrand() {
    try {
      setSaving(true);

      const cleanName = name.trim();

      if (!cleanName) {
        throw new Error("Debes escribir el nombre de la marca.");
      }

      const existing = productBrands.find(
        (b) => b.name.trim().toLowerCase() === cleanName.toLowerCase()
      );

      if (existing) {
        throw new Error("Esta marca ya existe.");
      }

      const { data: createdBrand, error } = await supabase
        .from("product_brands")
        .insert({
          seller_brand_id: brand.id,
          name: cleanName,
          logo_url: null,
          active: true,
        })
        .select()
        .single();

      if (error || !createdBrand) {
        throw new Error(
          "No se pudo crear la marca: " + (error?.message || "")
        );
      }

      if (logoFile) {
        const logoUrl = await uploadLogo(createdBrand.id, logoFile);

        const { error: updateError } = await supabase
          .from("product_brands")
          .update({ logo_url: logoUrl })
          .eq("id", createdBrand.id);

        if (updateError) {
          throw new Error(
            "La marca fue creada, pero no se pudo guardar el logo: " +
              updateError.message
          );
        }
      }

      setName("");
      setLogoFile(null);
      setPreviewLogo(null);

      await loadProductBrands(brand.id);

      alert("Marca creada correctamente.");
    } catch (e: any) {
      alert(e?.message || "Error creando la marca.");
      console.error(e);
    } finally {
      setSaving(false);
    }
  }

  if (loading || !brand) {
    return <div className="p-10 text-slate-300">Cargando marcas…</div>;
  }

  return (
    <div className="space-y-10 p-6">
      <div>
        <h1 className="text-3xl font-bold">Crear marca</h1>
        <p className="text-slate-400">
          Crea las marcas comerciales que luego podrás seleccionar al crear productos.
        </p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-5">
        <h2 className="text-xl font-semibold">Nueva marca comercial</h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Nombre de la marca
            </label>

            <input
              className="p-3 bg-slate-800 rounded w-full"
              placeholder="Ej: Nutrex, Apple, Adidas"
              value={name}
              onChange={(e) => setName(e.target.value)}
            />
          </div>

          <div>
            <label className="text-sm text-slate-300 font-semibold mb-1 block">
              Logo de la marca
            </label>

            <button
              type="button"
              onClick={() => document.getElementById("brandLogoUpload")?.click()}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-sm"
            >
              Subir logo
            </button>

            <input
              id="brandLogoUpload"
              type="file"
              accept="image/png,image/jpeg,image/webp"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0] || null;
                setLogoFile(file);

                if (file) {
                  setPreviewLogo(URL.createObjectURL(file));
                } else {
                  setPreviewLogo(null);
                }
              }}
            />

            <p className="text-xs text-slate-500 mt-2">
              Ideal: PNG sin fondo o logo con fondo blanco.
            </p>

            {previewLogo && (
              <div className="mt-4 bg-white rounded-lg p-4 w-fit">
                <img
                  src={previewLogo}
                  alt="Preview logo"
                  className="h-16 object-contain"
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleCreateBrand}
          disabled={saving}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 text-black font-bold rounded disabled:opacity-50"
        >
          {saving ? "Guardando..." : "Crear marca"}
        </button>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6 space-y-5">
        <div>
          <h2 className="text-xl font-semibold">Marcas creadas</h2>
          <p className="text-sm text-slate-400">
            Estas marcas aparecerán en la lista desplegable al crear productos.
          </p>
        </div>

        {productBrands.length === 0 ? (
          <div className="text-slate-400 text-sm">
            Aún no tienes marcas creadas.
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {productBrands.map((b) => (
              <div
                key={b.id}
                className="border border-slate-800 rounded-lg p-4 bg-slate-950/40"
              >
                <div className="h-20 bg-white rounded flex items-center justify-center p-3 mb-3">
                  {b.logo_url ? (
                    <img
                      src={b.logo_url}
                      alt={b.name}
                      className="max-h-14 object-contain"
                    />
                  ) : (
                    <span className="text-slate-400 text-xs">Sin logo</span>
                  )}
                </div>

                <div className="font-semibold text-white">{b.name}</div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}