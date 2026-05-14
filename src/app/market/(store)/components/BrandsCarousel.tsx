"use client";

type Brand = {
  id: string;
  name: string | null;
  logo_url?: string | null;
};

export default function BrandsCarousel({
  brands,
  onSelect,
}: {
  brands: Brand[];
  onSelect: (id: string) => void;
}) {
  if (!brands.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Marcas</h2>
          <p className="text-sm text-slate-500">
            Explora productos por marcas disponibles en NOVA.
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {brands.map((brand) => (
          <button
            key={brand.id}
            onClick={() => onSelect(brand.id)}
            className="shrink-0 w-36 rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition text-left cursor-pointer"
          >
            <div className="h-24 bg-slate-50 flex items-center justify-center p-4">
              {brand.logo_url ? (
                <img
                  src={brand.logo_url}
                  alt={brand.name || "Marca"}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-slate-100 flex items-center justify-center text-slate-400 font-black">
                  {(brand.name || "M").charAt(0).toUpperCase()}
                </div>
              )}
            </div>

            <div className="p-3">
              <div className="text-sm font-bold text-slate-900 truncate">
                {brand.name || "Marca"}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}