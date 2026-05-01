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
    if (total <= 1) return;
    if (!autoplayMs || autoplayMs < 1500) return;
    if (paused) return;

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [safeIndex]);

  if (!items || items.length === 0) return null;

  const current = items[safeIndex];

  function prev() {
    setIndex((i) => (i === 0 ? total - 1 : i - 1));
  }

  function next() {
    setIndex((i) => (i === total - 1 ? 0 : i + 1));
  }

  const Slide = (
    <div className="w-full">
      <div className="rounded-2xl overflow-hidden border border-slate-200 bg-slate-100">
        <div className="w-full h-[160px] sm:h-[220px] md:h-[280px] lg:h-[340px]">
          <img
            src={current.image}
            alt={current.alt || "Promoción"}
            className="w-full h-full object-cover"
          />
        </div>
      </div>
    </div>
  );

  return (
    <div
      className="w-full space-y-2"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div className="flex items-center justify-between px-1">
        <div className="text-sm font-bold text-slate-800">Promociones</div>

        <div className="flex gap-2">
          <button
            onClick={prev}
            className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
          >
            ←
          </button>
          <button
            onClick={next}
            className="px-3 py-1 rounded-full border border-slate-300 text-slate-700 hover:bg-slate-50 text-sm"
          >
            →
          </button>
        </div>
      </div>

      {current.href ? (
        <a href={current.href} className="block">
          {Slide}
        </a>
      ) : (
        Slide
      )}

      <div className="flex justify-center gap-2 mt-2">
        {items.map((_, i) => (
          <button
            key={i}
            onClick={() => setIndex(i)}
            className={`h-2.5 w-2.5 rounded-full transition ${
              i === safeIndex
                ? "bg-slate-800"
                : "bg-slate-300 hover:bg-slate-400"
            }`}
            aria-label={`Promo ${i + 1}`}
          />
        ))}
      </div>
    </div>
  );
}