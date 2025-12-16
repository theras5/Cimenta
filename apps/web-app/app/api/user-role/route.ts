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

    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const backendUrl = `${baseUrl}/user-role?user_id=${userId}&site_id=${siteId}`;
    
    console.log('📤 [user-role] Calling backend:', backendUrl);
    
    const response = await fetch(backendUrl, {
      headers: { Accept: "application/json" },
      cache: "no-store",
    });

    if (!response.ok) {
      let errorBody: any;
      const contentType = response.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          errorBody = await response.json();
        } else {
          errorBody = { error: await response.text() };
        }
      } catch (e) {
        errorBody = { error: `Error del servidor: ${response.status}` };
      }
      
      console.error("❌ [user-role] Backend error:", response.status, errorBody);
      return NextResponse.json(
        errorBody,
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [user-role] Connection error:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error("❌ [user-role] Error:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
