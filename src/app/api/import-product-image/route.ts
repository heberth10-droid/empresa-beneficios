import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

const IMAGE_BUCKET = "product-images";

export async function POST(req: NextRequest) {
  try {
    const { imageUrl, brandId, sku } = await req.json();

    if (!imageUrl || !brandId || !sku) {
      return NextResponse.json(
        { error: "Faltan imageUrl, brandId o sku" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Faltan variables de entorno de Supabase" },
        { status: 500 }
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey);

    const response = await fetch(imageUrl);

    if (!response.ok) {
      return NextResponse.json(
        { error: `No se pudo descargar la imagen: ${response.status}` },
        { status: 400 }
      );
    }

    const contentType = response.headers.get("content-type") || "image/jpeg";

    if (!contentType.startsWith("image/")) {
      return NextResponse.json(
        { error: "La URL no parece ser una imagen directa" },
        { status: 400 }
      );
    }

    const arrayBuffer = await response.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    const ext =
      contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
        ? "webp"
        : contentType.includes("gif")
        ? "gif"
        : "jpg";

    const safeSku = String(sku).replace(/[^a-zA-Z0-9-_]/g, "-");
    const fileName = `${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}.${ext}`;

    const filePath = `${brandId}/csv-imports/${safeSku}/${fileName}`;

    const { error: uploadError } = await supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .upload(filePath, buffer, {
        contentType,
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) {
      return NextResponse.json(
        { error: uploadError.message },
        { status: 500 }
      );
    }

    const publicUrl = supabaseAdmin.storage
      .from(IMAGE_BUCKET)
      .getPublicUrl(filePath).data.publicUrl;

    return NextResponse.json({ publicUrl });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Error importando imagen" },
      { status: 500 }
    );
  }
}