"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { supabase } from "@/lib/supabaseClient";
import { useCart } from "@/components/cart/CartProvider";
import { ShoppingCart, Star } from "lucide-react";

function normalizeImages(images: any): string[] {
  if (Array.isArray(images)) return images.filter((x) => typeof x === "string");
  if (typeof images === "string") {
    const t = images.trim();
    if (t.startsWith("[") && t.endsWith("]")) {
      try { const p = JSON.parse(t); if (Array.isArray(p)) return p.filter((x) => typeof x === "string"); } catch {}
    }
    if (t.includes("http") && t.includes(",")) return t.split(",").map((s) => s.trim()).filter((s) => s.startsWith("http"));
    if (t.startsWith("http")) return [t];
  }
  if (images && typeof images === "object") {
    const s = String(images).trim();
    if (s.includes("http") && s.includes(",")) return s.split(",").map((x) => x.trim()).filter((x) => x.startsWith("http"));
    if (s.startsWith("http")) return [s];
  }
  return [];
}

function formatCOP(value: number) {
  return new Intl.NumberFormat("es-CO", { style: "currency", currency: "COP", maximumFractionDigits: 0 }).format(Number(value || 0));
}

function StarRating({ rating, max = 5, size = 20, interactive = false, onChange }: {
  rating: number; max?: number; size?: number; interactive?: boolean; onChange?: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);
  return (
    <div className="flex items-center gap-0.5">
      {Array.from({ length: max }).map((_, i) => {
        const val = i + 1;
        const filled = interactive ? (hover || rating) >= val : rating >= val;
        const half = !interactive && !filled && rating >= val - 0.5;
        return (
          <span key={i}
            className={interactive ? "cursor-pointer" : ""}
            style={{ position: "relative", display: "inline-block", width: size, height: size }}
            onMouseEnter={() => interactive && setHover(val)}
            onMouseLeave={() => interactive && setHover(0)}
            onClick={() => interactive && onChange?.(val)}>
            <Star size={size} style={{ color: "var(--nomi-border)", fill: "var(--nomi-border)", position: "absolute", top: 0, left: 0 }} />
            {(filled || half) && (
              <span style={{ position: "absolute", top: 0, left: 0, width: filled ? "100%" : "50%", overflow: "hidden", display: "inline-block" }}>
                <Star size={size} style={{ color: "var(--nomi-orange)", fill: "var(--nomi-orange)" }} />
              </span>
            )}
          </span>
        );
      })}
    </div>
  );
}

export default function ProductView() {
  const { id } = useParams();
  const router = useRouter();
  const { addItem, items, subtotal } = useCart();

  const [product, setProduct] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [adding, setAdding] = useState(false);
  const [cartPreviewOpen, setCartPreviewOpen] = useState(false);
  const [selectedImg, setSelectedImg] = useState(0);

  const [reviews, setReviews] = useState<any[]>([]);
  const [reviewsLoading, setReviewsLoading] = useState(true);
  const [loggedEmployee, setLoggedEmployee] = useState<any>(null);
  const [myRating, setMyRating] = useState(0);
  const [myComment, setMyComment] = useState("");
  const [myName, setMyName] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitMsg, setSubmitMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    async function load() {
      if (!id) return;
      const { data, error } = await supabase.from("products").select("*").eq("id", id).single();
      if (error || !data) { router.push("/market"); return; }
      setProduct(data);
      setLoading(false);
    }
    load();
  }, [id, router]);

  useEffect(() => {
    async function loadReviews() {
      if (!id) return;
      const { data } = await supabase.from("product_reviews").select("*").eq("product_id", id).order("created_at", { ascending: false });
      setReviews(data || []);
      setReviewsLoading(false);
    }
    loadReviews();
  }, [id]);

  useEffect(() => {
    async function checkSession() {
      const { data: u } = await supabase.auth.getUser();
      if (!u?.user) return;
      const { data: userRow } = await supabase.from("users").select("role, company_id, employee_id").eq("auth_id", u.user.id).single();
      if (!userRow || userRow.role !== "EMPLOYEE") return;
      let emp: any = null;
      if (userRow.employee_id) {
        const { data } = await supabase.from("employees").select("id, name").eq("id", userRow.employee_id).single();
        emp = data;
      }
      if (!emp && u.user.email) {
        const { data } = await supabase.from("employees").select("id, name").eq("company_id", userRow.company_id).eq("email", u.user.email).single();
        emp = data;
      }
      if (emp) {
        setLoggedEmployee(emp);
        setMyName(emp.name?.split(" ")[0] || "");
      }
    }
    checkSession();
  }, []);

  const images = useMemo(() => {
    if (!product) return ["/no-image.png"];
    const imgs = normalizeImages(product.images);
    if (imgs.length > 0) return imgs;
    if (product.image_url) return [product.image_url];
    return ["/no-image.png"];
  }, [product]);

  const currentImg = images[selectedImg] || images[0] || "/no-image.png";

  const avgRating = useMemo(() => {
    if (!reviews.length) return 0;
    return reviews.reduce((acc, r) => acc + Number(r.rating), 0) / reviews.length;
  }, [reviews]);

  async function handleAdd() {
    if (!product) return;
    setAdding(true);
    const base = Number(product.price ?? 0);
    const discount = Number(product.discount_price ?? 0);
    const hasDiscount = discount > 0 && discount < base;
    const price = hasDiscount ? discount : base;
    addItem({ id: product.id, name: product.name, price: isNaN(price) ? 0 : price, image: currentImg }, 1);
    setAdding(false);
    setCartPreviewOpen(true);
    setTimeout(() => setCartPreviewOpen(false), 4500);
  }

  async function submitReview() {
    if (!myRating) { setSubmitMsg({ ok: false, text: "Selecciona una calificacion." }); return; }
    if (!myComment.trim()) { setSubmitMsg({ ok: false, text: "El comentario es obligatorio." }); return; }
    setSubmitting(true);
    const { error } = await supabase.from("product_reviews").insert({
      product_id: id,
      employee_id: loggedEmployee?.id || null,
      author_name: myName.trim() || "Anonimo",
      rating: myRating,
      comment: myComment.trim(),
    });
    setSubmitting(false);
    if (error) { setSubmitMsg({ ok: false, text: "Error al enviar: " + error.message }); return; }
    setSubmitMsg({ ok: true, text: "Gracias por tu calificacion!" });
    setMyRating(0); setMyComment("");
    const { data } = await supabase.from("product_reviews").select("*").eq("product_id", id).order("created_at", { ascending: false });
    setReviews(data || []);
    setTimeout(() => setSubmitMsg(null), 3000);
  }

  if (loading) return (
    <div className="flex items-center justify-center py-20">
      <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin" style={{ borderColor: "var(--nomi-orange)" }} />
    </div>
  );

  if (!product) return <div className="p-10" style={{ color: "#DC2626" }}>Producto no encontrado</div>;

  const basePrice = Number(product.price || 0);
  const discountPrice = Number(product.discount_price || 0);
  const hasDiscount = discountPrice > 0 && discountPrice < basePrice;
  const finalPrice = hasDiscount ? discountPrice : basePrice;
  const cuota4 = Math.round(finalPrice / 4);

  return (
    <>
      {cartPreviewOpen && (
        <div className="fixed top-0 right-0 h-full w-[360px] max-w-[90vw] bg-white z-[70] shadow-2xl p-5"
          style={{ borderLeft: "1.5px solid var(--nomi-border)" }}>
          <div className="flex items-start justify-between gap-3 mb-4">
            <div>
              <h2 className="text-lg font-black" style={{ color: "var(--nomi-navy)" }}>Carrito</h2>
              <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>{items.length} producto(s)</p>
            </div>
            <button onClick={() => setCartPreviewOpen(false)} className="text-2xl cursor-pointer" style={{ color: "var(--nomi-muted)" }}>x</button>
          </div>
          <div className="space-y-3 max-h-[60vh] overflow-y-auto">
            {items.slice(-4).reverse().map((it) => (
              <div key={it.id} className="flex gap-3 p-3 rounded-xl" style={{ border: "1.5px solid var(--nomi-border)" }}>
                <img src={it.image || "/no-image.png"} alt={it.name}
                  className="w-14 h-14 rounded-lg object-cover"
                  style={{ border: "1px solid var(--nomi-border)" }}
                  onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-sm truncate" style={{ color: "var(--nomi-navy)" }}>{it.name}</div>
                  <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>x{it.qty}</div>
                  <div className="text-sm font-black" style={{ color: "var(--nomi-teal)" }}>{formatCOP(it.price * it.qty)}</div>
                </div>
              </div>
            ))}
          </div>
          <div className="mt-5 pt-4" style={{ borderTop: "1.5px solid var(--nomi-border)" }}>
            <div className="flex items-center justify-between mb-4">
              <span className="text-sm" style={{ color: "var(--nomi-muted)" }}>Subtotal</span>
              <span className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>{formatCOP(subtotal)}</span>
            </div>
            <Link href="/market/cart"
              className="block w-full text-center py-3 rounded-xl font-black text-sm"
              style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
              Ir a comprar
            </Link>
          </div>
        </div>
      )}

      <div className="max-w-5xl mx-auto px-4 py-8 space-y-10">

        <div className="flex items-center gap-2 text-sm" style={{ color: "var(--nomi-muted)" }}>
          <Link href="/market" style={{ color: "var(--nomi-orange)" }}>Inicio</Link>
          <span>/</span>
          {product.category && (
            <>
              <Link href={`/market/category/${encodeURIComponent(product.category)}`} style={{ color: "var(--nomi-orange)" }}>{product.category}</Link>
              <span>/</span>
            </>
          )}
          <span className="truncate">{product.name}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">

          <div className="space-y-3">
            <div className="rounded-2xl overflow-hidden aspect-square"
              style={{ border: "1.5px solid var(--nomi-border)", backgroundColor: "var(--nomi-gray)" }}>
              <img src={currentImg} alt={product.name}
                className="w-full h-full object-contain"
                onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
            </div>
            {images.length > 1 && (
              <div className="flex gap-2 overflow-x-auto pb-1">
                {images.map((img, idx) => (
                  <button key={idx} onClick={() => setSelectedImg(idx)}
                    className="w-16 h-16 rounded-xl overflow-hidden shrink-0 cursor-pointer"
                    style={{
                      border: selectedImg === idx ? "2px solid var(--nomi-orange)" : "1.5px solid var(--nomi-border)",
                      backgroundColor: "var(--nomi-gray)",
                    }}>
                    <img src={img} alt="" className="w-full h-full object-contain"
                      onError={(e) => { (e.currentTarget as HTMLImageElement).src = "/no-image.png"; }} />
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="space-y-5">
            {product.category && (
              <span className="text-xs font-bold px-3 py-1 rounded-full"
                style={{ backgroundColor: "var(--nomi-orange-bg)", color: "var(--nomi-orange)" }}>
                {product.category}
              </span>
            )}

            <h1 className="text-2xl md:text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>{product.name}</h1>

            {reviews.length > 0 && (
              <div className="flex items-center gap-2">
                <StarRating rating={avgRating} size={18} />
                <span className="text-sm font-bold" style={{ color: "var(--nomi-navy)" }}>{avgRating.toFixed(1)}</span>
                <span className="text-sm" style={{ color: "var(--nomi-muted)" }}>({reviews.length} {reviews.length === 1 ? "resena" : "resenas"})</span>
              </div>
            )}

            <div className="space-y-2">
              {hasDiscount ? (
                <div className="flex items-center gap-3">
                  <span className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>{formatCOP(finalPrice)}</span>
                  <span className="text-lg line-through" style={{ color: "var(--nomi-muted)" }}>{formatCOP(basePrice)}</span>
                  <span className="text-xs font-bold px-2 py-1 rounded-full" style={{ backgroundColor: "#DCFCE7", color: "#16A34A" }}>
                    -{Math.round((1 - finalPrice / basePrice) * 100)}%
                  </span>
                </div>
              ) : (
                <span className="text-3xl font-black" style={{ color: "var(--nomi-navy)" }}>{formatCOP(finalPrice)}</span>
              )}

              <div className="rounded-xl px-4 py-3 space-y-1"
                style={{ backgroundColor: "var(--nomi-teal-bg)", border: "1.5px solid var(--nomi-teal)" }}>
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm" style={{ color: "var(--nomi-navy)" }}>4 cuotas de</span>
                  <span className="text-xl font-black" style={{ color: "var(--nomi-teal)" }}>{formatCOP(cuota4)}</span>
                  <span className="text-xs font-bold px-2 py-0.5 rounded-full"
                    style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                    Intereses: 0%
                  </span>
                </div>
                <p className="text-xs" style={{ color: "var(--nomi-muted)" }}>
                  Descuento automatico por nomina · Sin tramites · Sin estudio de credito
                </p>
              </div>
            </div>

            {product.description && (
              <p className="text-sm leading-relaxed" style={{ color: "var(--nomi-muted)" }}>{product.description}</p>
            )}

            <div className="flex gap-3">
              <button onClick={handleAdd} disabled={adding}
                className="flex-1 flex items-center justify-center gap-2 py-3.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-60 transition"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                <ShoppingCart className="w-4 h-4" />
                {adding ? "Agregando..." : "Agregar al carrito"}
              </button>
              <button onClick={() => { handleAdd(); router.push("/market/checkout"); }}
                className="flex-1 py-3.5 rounded-xl text-sm font-black cursor-pointer transition"
                style={{ backgroundColor: "var(--nomi-navy)", color: "#fff" }}>
                Comprar ahora
              </button>
            </div>

            <div className="flex gap-4 text-xs" style={{ color: "var(--nomi-muted)" }}>
              <span>Sin intereses</span>
              <span>Descuento por nomina</span>
              <span>Aprobacion inmediata</span>
            </div>
          </div>
        </div>

        {/* RESEÑAS */}
        <div className="space-y-6">
          <div>
            <h2 className="text-xl font-black" style={{ color: "var(--nomi-navy)" }}>Resenas y calificaciones</h2>
            {reviews.length > 0 && (
              <div className="flex items-center gap-3 mt-2">
                <span className="text-4xl font-black" style={{ color: "var(--nomi-navy)" }}>{avgRating.toFixed(1)}</span>
                <div>
                  <StarRating rating={avgRating} size={22} />
                  <p className="text-xs mt-1" style={{ color: "var(--nomi-muted)" }}>{reviews.length} {reviews.length === 1 ? "resena" : "resenas"}</p>
                </div>
              </div>
            )}
          </div>

          {/* FORMULARIO */}
          <div className="bg-white rounded-2xl p-5 space-y-4" style={{ border: "1.5px solid var(--nomi-border)" }}>
            <h3 className="font-black text-base" style={{ color: "var(--nomi-navy)" }}>Deja tu calificacion</h3>

            {submitMsg && (
              <div className="px-4 py-3 rounded-xl text-sm font-semibold"
                style={{ backgroundColor: submitMsg.ok ? "#DCFCE7" : "#FEE2E2", color: submitMsg.ok ? "#16A34A" : "#DC2626" }}>
                {submitMsg.text}
              </div>
            )}

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-bold mb-2 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Tu calificacion *</label>
                <StarRating rating={myRating} size={32} interactive onChange={setMyRating} />
                {myRating > 0 && (
                  <p className="text-xs mt-1 font-semibold" style={{ color: "var(--nomi-orange)" }}>
                    {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][myRating]}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>
                  Tu nombre (opcional)
                </label>
                <input value={myName} onChange={(e) => setMyName(e.target.value)}
                  placeholder={loggedEmployee ? loggedEmployee.name : "Como quieres aparecer — si no lo pones seras Anonimo"}
                  disabled={!!loggedEmployee}
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                  style={{
                    border: "1.5px solid var(--nomi-border)",
                    color: "var(--nomi-navy)",
                    backgroundColor: loggedEmployee ? "var(--nomi-gray)" : "#fff",
                  }} />
                {loggedEmployee && (
                  <p className="text-xs mt-1" style={{ color: "var(--nomi-teal)" }}>
                    Publicando como {loggedEmployee.name}
                  </p>
                )}
              </div>

              <div>
                <label className="block text-xs font-bold mb-1.5 uppercase tracking-wide" style={{ color: "var(--nomi-navy)" }}>Comentario *</label>
                <textarea value={myComment} onChange={(e) => setMyComment(e.target.value)}
                  rows={3} placeholder="Cuentanos tu experiencia con este producto..."
                  className="w-full px-4 py-2.5 rounded-xl text-sm outline-none resize-none"
                  style={{ border: "1.5px solid var(--nomi-border)", color: "var(--nomi-navy)", backgroundColor: "#fff" }} />
              </div>

              <button onClick={submitReview} disabled={submitting || !myRating || !myComment.trim()}
                className="px-6 py-2.5 rounded-xl text-sm font-black cursor-pointer disabled:opacity-50"
                style={{ backgroundColor: "var(--nomi-orange)", color: "#fff" }}>
                {submitting ? "Enviando..." : "Publicar resena"}
              </button>
            </div>
          </div>

          {/* LISTA DE RESEÑAS */}
          {reviewsLoading ? (
            <div className="space-y-3">
              {[1,2].map(i => <div key={i} className="h-20 rounded-2xl animate-pulse" style={{ backgroundColor: "var(--nomi-border)" }} />)}
            </div>
          ) : reviews.length === 0 ? (
            <div className="bg-white rounded-2xl p-8 text-center" style={{ border: "1.5px solid var(--nomi-border)" }}>
              <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>Aun no hay resenas. Se el primero en calificar este producto.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {reviews.map((r) => (
                <div key={r.id} className="bg-white rounded-2xl p-5 space-y-2" style={{ border: "1.5px solid var(--nomi-border)" }}>
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-black text-white shrink-0"
                        style={{ backgroundColor: "var(--nomi-navy)" }}>
                        {(r.author_name || "A").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <div className="font-bold text-sm" style={{ color: "var(--nomi-navy)" }}>{r.author_name}</div>
                        <div className="text-xs" style={{ color: "var(--nomi-muted)" }}>
                          {new Date(r.created_at).toLocaleDateString("es-CO", { year: "numeric", month: "long", day: "numeric" })}
                        </div>
                      </div>
                    </div>
                    <StarRating rating={r.rating} size={16} />
                  </div>
                  {r.comment && <p className="text-sm" style={{ color: "var(--nomi-muted)" }}>{r.comment}</p>}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  );
}
