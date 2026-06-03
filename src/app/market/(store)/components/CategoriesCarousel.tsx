"use client";

import { useRouter } from "next/navigation";

type Category = {
  id: string;
  name: string;
  image_url?: string | null;
};

function enc(value: string) {
  return encodeURIComponent(value);
}

export default function CategoriesCarousel({
  categories,
}: {
  categories: Category[];
  onSelect?: (name: string) => void;
}) {
  const router = useRouter();

  if (!categories.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-widest mb-1"
            style={{ color: "var(--nomi-teal)" }}>
            Explora por tipo
          </p>
          <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>
            Categorías
          </h2>
        </div>
        <button
          onClick={() => router.push("/market/catalog")}
          className="text-xs font-bold hidden md:block"
          style={{ color: "var(--nomi-teal)" }}>
          Ver todas →
        </button>
      </div>

      <div className="flex gap-3 overflow-x-auto pb-2 scroll-hide">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => router.push(`/market/category/${enc(cat.name)}`)}
            className="shrink-0 flex flex-col items-center gap-0 rounded-2xl overflow-hidden transition cursor-pointer hover:shadow-md hover:-translate-y-0.5 group"
            style={{
              width: "120px",
              backgroundColor: "#fff",
              border: "1.5px solid var(--nomi-border)",
            }}
          >
            {/* IMAGEN */}
            <div className="w-full h-20 overflow-hidden" style={{ backgroundColor: "var(--nomi-gray)" }}>
              <img
                src={cat.image_url || "/no-image.png"}
                alt={cat.name}
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
            </div>

            {/* NOMBRE */}
            <div className="w-full px-2 py-2.5 text-center">
              <div className="text-xs font-bold leading-tight"
                style={{ color: "var(--nomi-navy)" }}>
                {cat.name}
              </div>
            </div>

            {/* ACENTO INFERIOR */}
            <div className="w-full h-1 transition-all duration-300 opacity-0 group-hover:opacity-100"
              style={{ backgroundColor: "var(--nomi-orange)" }} />
          </button>
        ))}
      </div>
    </section>
  );
}
