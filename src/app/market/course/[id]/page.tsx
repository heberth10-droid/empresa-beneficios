"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";
import { BookOpen, CheckCircle } from "lucide-react";

function money(n: any) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(n || 0));
}

export default function CourseDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const { addItem } = useCart();
  const [course, setCourse] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [added, setAdded] = useState(false);

  useEffect(() => {
    async function load() {
      const { data } = await supabase.from("courses").select("*").eq("id", id).eq("active", true).single();
      if (!data) { router.push("/market/courses"); return; }
      setCourse(data);
      setLoading(false);
    }
    load();
  }, [id, router]);

  function addToCart() {
    if (!course) return;
    const finalPrice = course.discount_price || course.price;
    addItem({
      id: course.id,
      name: course.name,
      price: finalPrice,
      image: course.image_url || "",
      isCourse: true,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  const finalPrice = course.discount_price || course.price;

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 space-y-6">

      <div className="flex items-center gap-2 text-sm" style={{ color: "var(--nomi-muted)" }}>
        <Link href="/market/courses" style={{ color: "var(--nomi-orange)" }}>Cursos</Link>
        <span>/</span>
        <span>{course.name}</span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

        {/* IMAGEN */}
        <div className="rounded-2xl overflow-hidden" style={{ border: "1.5px solid var(--nomi-border)", backgroundColor: "var(--nomi-gray)" }}>
          {course.image_url
            ? <img src={course.image_url} className="w-full object-cover" alt={course.name}
                onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = "none"; }} />
            : <div className="h-64 flex items-center justify-center">
                <BookOpen className="w-16 h-16" style={{ color: "var(--nomi-border)" }} />
              </div>}
        </div>

        {/* INFO */}
        <div className="space-y-5">
          {course.category && (
            <span className="text-xs font-bold px-3 py-1.5 rounded-full"
              style={{ backgroundColor: "#EDE9FE", color: "#8B5CF6" }}>{course.category}</span>
          )}

          <h1 className="text-2xl font-black" style={{ color: "var(--nomi-navy)" }}>{course.name}</h1>

          {course.description && (
            <p className="text-sm leading-relaxed" style={{ color: "var(--nomi-muted)" }}>{course.description}</p>
          )}

          <div className="flex items-center gap-3">
            <span className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>{money(finalPrice)}</span>
            {course.discount_price && (
              <span className="text-lg line-through" style={{ color: "var(--nomi-muted)" }}>{money(course.price)}</span>
            )}
          </div>

          <div className="rounded-xl p-4 space-y-2" style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px solid var(--nomi-teal)" }}>
            <p className="text-xs font-bold uppercase tracking-wide" style={{ color: "var(--nomi-teal)" }}>Como funciona</p>
            {[
              "Compra el curso con tu cupo de nomina sin intereses",
              "El descuento se hace automaticamente en tu nomina",
              "En los siguientes 8 dias recibes el acceso al curso en tu correo",
            ].map((txt, i) => (
              <div key={i} className="flex items-start gap-2 text-sm">
                <CheckCircle className="w-4 h-4 shrink-0 mt-0.5" style={{ color: "var(--nomi-teal)" }} />
                <span style={{ color: "var(--nomi-navy)" }}>{txt}</span>
              </div>
            ))}
          </div>

          <button onClick={addToCart}
            className="w-full py-3.5 rounded-xl text-sm font-black cursor-pointer transition"
            style={{ backgroundColor: added ? "#16A34A" : "var(--nomi-orange)", color: "#fff" }}>
            {added ? "✓ Agregado al carrito" : "Agregar al carrito"}
          </button>

          <button onClick={() => { addToCart(); router.push("/market/checkout"); }}
            className="w-full py-3.5 rounded-xl text-sm font-bold cursor-pointer transition"
            style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
            Comprar ahora
          </button>
        </div>
      </div>
    </div>
  );
}
