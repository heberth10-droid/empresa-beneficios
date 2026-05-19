"use client";

export default function AdminWebsitePage() {
  return (
    <div className="space-y-5">
      <h1 className="text-3xl font-black">Página web</h1>
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-5 space-y-3">
        <p className="text-slate-300">Aquí gestionaremos logo, favicon, banners y categorías destacadas.</p>
        <p className="text-sm text-slate-400">Medida sugerida banner principal: 1440 x 420 px.</p>
        <p className="text-sm text-slate-400">Medida sugerida favicon: 512 x 512 px.</p>
      </div>
    </div>
  );
}
