import { NextRequest, NextResponse } from 'next/server';

// Obtener la URL base del servidor desde las variables de entorno
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

// GET - Obtener todos los sitios
export async function GET() {
  try {
    const response = await fetch(`${API_URL}/sites`, {
      headers: {
        'Accept': 'application/json',
      },
      next: { revalidate: 60 }, // Revalidar cada minuto
    });
    
    if (!response.ok) {
      return NextResponse.json(
        { error: 'Error al obtener sitios' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Error en la API de sitios:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST - Crear un nuevo sitio
export async function POST(request: NextRequest) {
  try {
    console.log('📥 POST /api/sites - Request received');
    
    const body = await request.json();
    console.log('📥 POST /api/sites - Body:', body);
    
    // Validaciones básicas
    if (!body.address || !body.user_id) {
      console.log('❌ POST /api/sites - Validation failed:', { address: body.address, user_id: body.user_id });
      return NextResponse.json(
        { error: 'Dirección y ID de usuario son obligatorios' },
        { status: 400 }
      );
    }
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const sitesUrl = `${baseUrl}/sites`;
    console.log('📤 POST /api/sites - Calling backend:', sitesUrl);
    
    const response = await fetch(sitesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    console.log('📥 POST /api/sites - Backend response status:', response.status);
    
    if (!response.ok) {
      let errorData: any;
      const contentType = response.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          errorData = { error: await response.text() };
        }
      } catch (e) {
        errorData = { error: `Error del servidor: ${response.status}` };
      }
      
      console.error('❌ POST /api/sites - Backend error:', errorData);
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    console.log('✅ POST /api/sites - Site created successfully');
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ POST /api/sites - Connection error:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error('❌ POST /api/sites - Error:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}