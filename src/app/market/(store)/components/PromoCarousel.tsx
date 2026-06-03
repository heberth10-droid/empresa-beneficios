"use client";

import { useEffect, useMemo, useRef, useState } from "react";

type Promo = {
  id: string;
  image: string;
  href?: string;
  alt?: string;
};

export default function PromoCarousel({
  items,
  autoplayMs = 6000,
}: {
  items: Promo[];
  autoplayMs?: number;
}) {
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const timerRef = useRef<number | null>(null);

  const total = items?.length || 0;

  const safeIndex = useMemo(() => {
    if (total === 0) return 0;
    return Math.min(index, total - 1);
  }, [index, total]);

  useEffect(() => {
    if (total <= 1 || !autoplayMs || autoplayMs < 1500 || paused) return;
    timerRef.current = window.setInterval(() => {
      setIndex((i) => (i === total - 1 ? 0 : i + 1));
    }, autoplayMs);
    return () => {
      if (timerRef.current) window.clearInterval(timerRef.current);
      timerRef.current = null;
    };
  }, [total, autoplayMs, paused]);

  useEffect(() => {
    if (safeIndex !== index) setIndex(safeIndex);
  }, [safeIndex]);

  if (!items || items.length === 0) return null;

  const current = items[safeIndex];

  function prev() { setIndex((i) => (i === 0 ? total - 1 : i - 1)); }
  function next() { setIndex((i) => (i === total - 1 ? 0 : i + 1)); }

  const Slide = (
    <div className="w-full rounded-2xl overflow-hidden"
      style={{ border: "1.5px solid var(--nomi-border)" }}>
      <div className="w-full h-[160px] sm:h-[220px] md:h-[300px] lg:h-[360px]">
        <img
          src={current.image}
          alt={current.alt || "Promoción NOMI"}
          className="w-full h-full object-cover"
        />
      </div>
    </div>
  );

  return (
    <div
      className="w-full space-y-3"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {/* HEADER */}
      <div className="flex items-center justify-between px-1">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-widest"
            style={{ color: "var(--nomi-teal)" }}>
            Promociones
          </span>
          {total > 1 && (
            <span className="text-xs px-2 py-0.5 rounded-full font-semibold"
              style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
              {total} ofertas
            </span>
          )}
        </div>
        {total > 1 && (
          <div className="flex gap-1.5">
            <button onClick={prev}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition cursor-pointer"
              style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}>
              ←
            </button>
            <button onClick={next}
              className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-bold transition cursor-pointer"
              style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }}>
              →
            </button>
          </div>
        )}
      </div>

      {/* SLIDE */}
      {current.href ? (
        <a href={current.href} className="block">{Slide}</a>
      ) : (
        Slide
      )}

      {/* DOTS */}
      {total > 1 && (
        <div className="flex justify-center gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={() => setIndex(i)}
              className="h-2 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: i === safeIndex ? "24px" : "8px",
                backgroundColor: i === safeIndex ? "var(--nomi-orange)" : "var(--nomi-border)",
              }}
              aria-label={`Promo ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
