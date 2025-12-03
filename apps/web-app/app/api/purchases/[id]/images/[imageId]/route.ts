import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; imageId: string } }
) {
  try {
    const { id, imageId } = params;

    console.log("🗑️ Eliminando imagen:", imageId, "de purchase:", id);

    const response = await fetch(`${API_URL}/purchases/${id}/images/${imageId}`, {
      method: "DELETE",
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("❌ Error del backend:", errorText);
      return NextResponse.json(
        { error: "Error al eliminar la imagen" },
        { status: response.status }
      );
    }

    console.log("✅ Imagen eliminada exitosamente");

    return NextResponse.json({ message: "Imagen eliminada" }, { status: 200 });
  } catch (error) {
    console.error("❌ Error en DELETE /api/purchases/[id]/images/[imageId]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
