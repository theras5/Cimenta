import { NextRequest, NextResponse } from "next/server";

// En el servidor usamos API_URL (sin NEXT_PUBLIC_)
// El servidor Express corre en el puerto 3000
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log("📤 Enviando invitación al backend:", { 
      url: `${API_URL}/invitations`,
      body 
    });

    const response = await fetch(`${API_URL}/invitations`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();
    
    console.log("📥 Respuesta del backend:", { 
      status: response.status,
      data 
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: data.error || "Error al crear la invitación" },
        { status: response.status }
      );
    }

    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("❌ Error en POST /api/invitations:", error);
    return NextResponse.json(
      { error: "Error interno del servidor" },
      { status: 500 }
    );
  }
}
