import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    console.log("📥 Obteniendo imágenes para purchase:", id);

    const response = await fetch(`${API_URL}/purchases/${id}/images`);

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error del backend:", errorText);
      return NextResponse.json(
        { error: "Error al obtener las imágenes" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log(`✅ ${data.length} imágenes obtenidas`);

    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ Error en GET /api/purchases/[id]/images:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();

    console.log("📤 Subiendo imagen para purchase:", id);

    const response = await fetch(`${API_URL}/purchases/${id}/images`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error del backend:", errorText);
      return NextResponse.json(
        { error: "Error al subir la imagen" },
        { status: response.status }
      );
    }

    const data = await response.json();
    console.log("✅ Imagen subida exitosamente");

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("❌ Error en POST /api/purchases/[id]/images:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
