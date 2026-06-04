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
  autoplayMs = 5000,
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

  function prev() {
    setIndex((i) => (i === 0 ? total - 1 : i - 1));
    setPaused(true);
    setTimeout(() => setPaused(false), 6000);
  }
  function next() {
    setIndex((i) => (i === total - 1 ? 0 : i + 1));
    setPaused(true);
    setTimeout(() => setPaused(false), 6000);
  }

  const slideContent = (
    <div
      className="promo-slide-mobile relative w-full overflow-hidden"
      style={{
        borderRadius: "16px",
        border: "1.5px solid var(--nomi-border)",
      }}
    >
      {/* IMAGEN
          Tamaños recomendados:
          - Desktop: 1280 x 420 px (ratio 16:5)
          - Mobile:  750 x 560 px  (ratio ~4:3)
      */}
      <div className="w-full"
        style={{
          height: "clamp(180px, 42vw, 420px)",
        }}>
        <img
          src={current.image}
          alt={current.alt || "Promocion NOMI"}
          className="w-full h-full object-cover transition-opacity duration-500"
        />
      </div>

      {/* FLECHA IZQUIERDA */}
      {total > 1 && (
        <button
          onClick={(e) => { e.preventDefault(); prev(); }}
          className="absolute left-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition"
          style={{ backgroundColor: "rgba(255,255,255,0.85)", color: "var(--nomi-navy)" }}
          aria-label="Anterior"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
      )}

      {/* FLECHA DERECHA */}
      {total > 1 && (
        <button
          onClick={(e) => { e.preventDefault(); next(); }}
          className="absolute right-3 top-1/2 -translate-y-1/2 w-10 h-10 rounded-full flex items-center justify-center cursor-pointer transition"
          style={{ backgroundColor: "rgba(255,255,255,0.85)", color: "var(--nomi-navy)" }}
          aria-label="Siguiente"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      )}

      {/* DOTS */}
      {total > 1 && (
        <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-2">
          {items.map((_, i) => (
            <button
              key={i}
              onClick={(e) => { e.preventDefault(); setIndex(i); }}
              className="h-2 rounded-full transition-all duration-300 cursor-pointer"
              style={{
                width: i === safeIndex ? "24px" : "8px",
                backgroundColor: i === safeIndex ? "var(--nomi-orange)" : "rgba(255,255,255,0.6)",
              }}
              aria-label={`Slide ${i + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div
      className="-mx-4 md:mx-0"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
    >
      {current.href ? (
        <a href={current.href} className="block">{slideContent}</a>
      ) : (
        slideContent
      )}
    </div>
  );
}
