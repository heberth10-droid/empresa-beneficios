"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { useRouter, useParams } from "next/navigation";

const IMAGE_BUCKET = "product-images";

export default function EditProductPage() {
  const router = useRouter();
  const { id } = useParams(); // product_id desde la URL

  const [loading, setLoading] = useState(true);
  const [product, setProduct] = useState<any>(null);
  const [brand, setBrand] = useState<any>(null);
  const [variants, setVariants] = useState<any[]>([]);

  // Campos del formulario
  const [name, setName] = useState("");
  const [sku, setSku] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [discount, setDiscount] = useState("");
  const [stock, setStock] = useState("");
  const [active, setActive] = useState(true);
  const [files, setFiles] = useState<FileList | null>(null);

  // -----------------------------------------------------------
  // CARGAR PRODUCTO + MARCA + VARIANTES + VALIDAR ROL
  // -----------------------------------------------------------
  useEffect(() => {
    async function load() {
      // 1. Validar usuario
      const { data: authUser } = await supabase.auth.getUser();
      const user = authUser?.user;

      if (!user) return router.push("/login");

      // 2. Obtener usuario interno
      const { data: userRow } = await supabase
        .from("users")
        .select("*")
        .eq("auth_id", user.id)
        .single();

      if (!userRow || userRow.role !== "BRAND_ADMIN") {
        return router.push("/login");
      }

      // 3. Obtener marca a la que pertenece
      const { data: brandData } = await supabase
        .from("brands")
        .select("*")
        .eq("id", userRow.brand_id)
        .single();

      setBrand(brandData);

      // 4. Obtener producto
      const { data: prod } = await supabase
        .from("products")
        .select("*")
        .eq("id", id)
        .single();

      if (!prod) {
        alert("Producto no encontrado");
        return router.push("/brand/products");
      }

      setProduct(prod);

      // llenar formulario
      setName(prod.name);
      setSku(prod.sku || "");
      setDescription(prod.description);
      setPrice(prod.price);
      setDiscount(prod.discount_price || "");
      setStock(prod.stock);
      setActive(prod.active);

      // 5. Variantes
      const { data: varData } = await supabase
        .from("product_variants")
        .select("*")
        .eq("product_id", id);

      setVariants(varData || []);

      setLoading(false);
    }

    load();
  }, [id, router]);

  // -----------------------------------------------------------
  // SUBIR IMÁGENES NUEVAS (CORREGIDO)
  // -----------------------------------------------------------
  async function uploadImages() {
    // Protección doble
    if (!brand || !product) return [];
    if (!files || files.length === 0) return [];

    const urls: string[] = [];

    for (const file of Array.from(files)) {
      const ext = file.name.split(".").pop();
      const fileName = `${Date.now()}-${Math.random().toString(36)}.${ext}`;

      // Usamos la marca del usuario logueado, no del producto
      const filePath = `${brand.id}/${product.id}/${fileName}`;

      const { error } = await supabase.storage
        .from(IMAGE_BUCKET)
        .upload(filePath, file, {
          contentType: file.type,
          cacheControl: "3600",
        });

      if (!error) {
        const publicUrl = supabase.storage
          .from(IMAGE_BUCKET)
          .getPublicUrl(filePath).data.publicUrl;

        urls.push(publicUrl);
      }
    }

    return urls;
  }

  // -----------------------------------------------------------
  // GUARDAR CAMBIOS
  // -----------------------------------------------------------
  async function saveChanges() {
    if (!product) return;

    let images = product.images || [];

    // subir archivos
    const newImages = await uploadImages();
    if (newImages.length > 0) {
      images = [...images, ...newImages];
    }

    const { error } = await supabase
      .from("products")
      .update({
        name,
        sku,
        description,
        price: Number(price),
        discount_price: discount ? Number(discount) : null,
        stock: Number(stock),
        active,
        images,
      })
      .eq("id", product.id);

    if (error) {
      console.error(error);
      return alert("Error guardando los cambios.");
    }

    alert("Producto actualizado correctamente");
    router.push("/brand/products");
  }

  // -----------------------------------------------------------
  // ELIMINAR UNA IMAGEN
  // -----------------------------------------------------------
  async function removeImage(url: string) {
    if (!product) return;

    const newList = product.images.filter((img: string) => img !== url);

    await supabase
      .from("products")
      .update({ images: newList })
      .eq("id", product.id);

    setProduct({ ...product, images: newList });
  }

  // -----------------------------------------------------------

  if (loading) return <div className="p-10 text-slate-300">Cargando…</div>;

  return (
    <div className="p-6 space-y-8">

      <h1 className="text-2xl font-bold">
        Editar producto — {product.name}
      </h1>

      <div className="bg-slate-900 p-6 rounded border border-slate-800 space-y-6">

        {/* FORMULARIO */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <input
            className="bg-slate-800 p-3 rounded"
            value={name}
            placeholder="Nombre"
            onChange={(e) => setName(e.target.value)}
          />

          <input
            className="bg-slate-800 p-3 rounded"
            value={sku}
            placeholder="SKU"
            onChange={(e) => setSku(e.target.value)}
          />

          <input
            className="bg-slate-800 p-3 rounded"
            value={price}
            placeholder="Precio"
            onChange={(e) => setPrice(e.target.value)}
          />

          <input
            className="bg-slate-800 p-3 rounded"
            value={discount}
            placeholder="Precio descuento"
            onChange={(e) => setDiscount(e.target.value)}
          />

          <input
            className="bg-slate-800 p-3 rounded"
            value={stock}
            placeholder="Stock"
            onChange={(e) => setStock(e.target.value)}
          />
        </div>

        <textarea
          className="bg-slate-800 p-3 rounded w-full"
          rows={4}
          value={description}
          placeholder="Descripción"
          onChange={(e) => setDescription(e.target.value)}
        ></textarea>

        {/* ACTIVE */}
        <label className="flex items-center gap-2">
          <input
            type="checkbox"
            checked={active}
            onChange={() => setActive(!active)}
          />
          Producto activo
        </label>

        {/* IMÁGENES */}
        <div>
          <h2 className="font-semibold mb-2">Imágenes</h2>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
            {product.images?.map((img: string) => (
              <div
                key={img}
                className="relative border border-slate-700 rounded"
              >
                <img src={img} className="w-full h-32 object-cover rounded" />
                <button
                  onClick={() => removeImage(img)}
                  className="absolute top-1 right-1 bg-red-500 px-2 py-1 rounded text-xs"
                >
                  X
                </button>
              </div>
            ))}
          </div>

          <button
            type="button"
            onClick={() =>
              document.getElementById("uploadMore")?.click()
            }
            className="bg-slate-800 border border-slate-700 px-4 py-2 rounded"
          >
            Añadir más imágenes
          </button>

          <input
            id="uploadMore"
            type="file"
            multiple
            accept="image/*"
            className="hidden"
            onChange={(e) => setFiles(e.target.files)}
          />
        </div>

        <button
          onClick={saveChanges}
          className="bg-emerald-500 hover:bg-emerald-400 px-6 py-3 text-black font-bold rounded"
        >
          Guardar cambios
        </button>
      </div>
    </div>
  );
}