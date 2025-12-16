import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// GET - Obtener sitios por usuario
export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const { userId } = await params; // ← Await params aquí
    
    console.log(`Fetching sites for user: ${userId}`); // Este log aparecerá en la terminal
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const sitesUrl = `${baseUrl}/sites/user/${userId}`;
    console.log(`Calling sites endpoint: ${sitesUrl}`);
    
    const response = await fetch(sitesUrl, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Cambié de next.revalidate a cache no-store
    });
    
    if (!response.ok) {
      // Intentar leer el cuerpo de error del backend
      let serverBody: any;
      const contentType = response.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          serverBody = await response.json();
        } else {
          serverBody = { error: await response.text() };
        }
      } catch (e) {
        serverBody = { error: `Error del servidor: ${response.status}` };
      }
      
      console.error(`Backend responded with status: ${response.status}`, serverBody);
      return NextResponse.json(serverBody, { status: response.status });
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.length || 0} sites`);
    return NextResponse.json(data);
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Error de conexión al backend:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error(`Error al obtener sitios del usuario:`, error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}