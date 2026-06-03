"use client";

import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  name: string | null;
  logo_url?: string | null;
};

export default function BrandsCarousel({ brands }: { brands: Brand[] }) {
  const router = useRouter();

  if (!brands.length) return null;

  const doubled = [...brands, ...brands];

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>
            Marcas aliadas
          </p>
          <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
            Las mejores marcas, <span style={{ color: "var(--nomi-orange)" }}>tus cuotas</span>
          </h2>
        </div>
        <button
          onClick={() => router.push("/market/catalog")}
          className="text-xs font-bold hidden md:block"
          style={{ color: "var(--nomi-teal)" }}>
          Ver catálogo →
        </button>
      </div>

      {/* CARRUSEL INFINITO */}
      <div className="overflow-hidden">
        <div className="brands-track">
          {doubled.map((brand, idx) => (
            <button
              key={`${brand.id}-${idx}`}
              onClick={() => router.push(`/market/brand/${brand.id}`)}
              className="shrink-0 flex flex-col items-center justify-center gap-2 rounded-2xl transition cursor-pointer"
              style={{
                width: "110px",
                height: "80px",
                backgroundColor: "#fff",
                border: "1.5px solid var(--nomi-border)",
                padding: "12px 8px",
              }}
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name || "Marca"}
                  className="w-full h-full object-contain"
                  style={{ maxHeight: "44px" }}
                />
              ) : (
                <>
                  <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-black text-white"
                    style={{ backgroundColor: "var(--nomi-navy)" }}>
                    {(brand.name || "M").charAt(0).toUpperCase()}
                  </div>
                  <div className="text-xs font-bold truncate w-full text-center"
                    style={{ color: "var(--nomi-navy)" }}>
                    {brand.name || "Marca"}
                  </div>
                </>
              )}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}
