"use client";

import { useRef } from "react";
import { useRouter } from "next/navigation";

type Brand = {
  id: string;
  name: string | null;
  logo_url?: string | null;
};

export default function BrandsCarousel({ brands }: { brands: Brand[] }) {
  const router = useRouter();
  const scrollRef = useRef<HTMLDivElement>(null);

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
            Las mejores marcas,{" "}
            <span style={{ color: "var(--nomi-orange)" }}>tus cuotas</span>
          </h2>
        </div>
        <button
          onClick={() => router.push("/market/catalog")}
          className="text-xs font-bold hidden md:block"
          style={{ color: "var(--nomi-teal)" }}>
          Ver catálogo →
        </button>
      </div>

      {/* CARRUSEL: animación CSS lenta + scroll táctil/mouse encima */}
      <div
        ref={scrollRef}
        className="overflow-x-auto scroll-hide"
        style={{ cursor: "grab" }}
        onMouseDown={(e) => {
          const el = scrollRef.current;
          if (!el) return;
          el.style.cursor = "grabbing";
          el.style.userSelect = "none";
          const startX = e.pageX - el.offsetLeft;
          const scrollLeft = el.scrollLeft;
          const onMove = (ev: MouseEvent) => {
            const x = ev.pageX - el.offsetLeft;
            el.scrollLeft = scrollLeft - (x - startX);
          };
          const onUp = () => {
            el.style.cursor = "grab";
            el.style.userSelect = "";
            window.removeEventListener("mousemove", onMove);
            window.removeEventListener("mouseup", onUp);
          };
          window.addEventListener("mousemove", onMove);
          window.addEventListener("mouseup", onUp);
        }}
      >
        <div
          className="brands-track"
          style={{ animationDuration: "40s" }}
        >
          {doubled.map((brand, idx) => (
            <button
              key={`${brand.id}-${idx}`}
              onClick={() => router.push(`/market/brand/${brand.id}`)}
              className="shrink-0 flex flex-col items-center justify-center gap-1.5 rounded-2xl transition-all cursor-pointer hover:shadow-md hover:-translate-y-0.5"
              style={{
                width: "110px",
                height: "76px",
                backgroundColor: "#fff",
                border: "1.5px solid var(--nomi-border)",
                padding: "10px 8px",
              }}
            >
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name || "Marca"}
                  className="object-contain"
                  style={{ maxWidth: "80px", maxHeight: "40px" }}
                  draggable={false}
                />
              ) : (
                <>
                  <div
                    className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-black text-white"
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
