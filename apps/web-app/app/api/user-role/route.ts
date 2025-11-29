import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get("user_id");
    const siteId = searchParams.get("site_id");

    if (!userId || !siteId) {
      return NextResponse.json(
        { error: "Faltan parámetros user_id o site_id" },
        { status: 400 }
      );
    }

    const response = await fetch(
      `${API_URL}/user-role?user_id=${userId}&site_id=${siteId}`,
      {
        headers: { Accept: "application/json" },
        cache: "no-store",
      }
    );

    if (!response.ok) {
      const body = await response.text();
      console.error("Error backend user-role:", response.status, body);
      return NextResponse.json(
        { error: "No se pudo obtener el rol" },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en API user-role:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
