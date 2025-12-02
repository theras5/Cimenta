import { NextRequest, NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:4000";

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params;

    const response = await fetch(`${API_URL}/invitations/token/${token}`);

    const data = await response.json();

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Error al obtener la invitación" },
        { status: response.status }
      );
    }

    return NextResponse.json(data);
  } catch (error) {
    console.error("Error en GET /api/invitations/token/[token]:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
