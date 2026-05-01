"use client";

type Category = {
  id: string;
  name: string;
  image_url?: string | null;
};

export default function CategoriesCarousel({
  categories,
  onSelect,
}: {
  categories: Category[];
  onSelect: (name: string) => void;
}) {
  if (!categories.length) return null;

  return (
    <section className="space-y-3">
      <div className="flex items-end justify-between">
        <div>
          <h2 className="text-xl font-black text-slate-900">Categorías</h2>
          <p className="text-sm text-slate-500">
            Explora beneficios por tipo de producto.
          </p>
        </div>
      </div>

      <div className="flex gap-4 overflow-x-auto pb-2">
        {categories.map((cat) => (
          <button
            key={cat.id}
            onClick={() => onSelect(cat.name)}
            className="shrink-0 w-36 rounded-2xl border border-slate-200 bg-white overflow-hidden hover:shadow-md transition text-left"
          >
            <div className="h-24 bg-slate-100">
              <img
                src={cat.image_url || "/no-image.png"}
                alt={cat.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="p-3">
              <div className="text-sm font-bold text-slate-900 truncate">
                {cat.name}
              </div>
            </div>
          </button>
        ))}
      </div>
    </section>
  );
}