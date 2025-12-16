import { NextRequest, NextResponse } from 'next/server';

// En el servidor usamos API_URL (sin NEXT_PUBLIC_)
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    
    if (!siteId) {
      return NextResponse.json(
        { error: 'Se requiere site_id' },
        { status: 400 }
      );
    }
    
    console.log('📥 Obteniendo compras para site:', siteId);
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const purchasesUrl = `${baseUrl}/purchases/site/${siteId}`;
    console.log('Calling purchases endpoint:', purchasesUrl);
    
    // Endpoint específico para filtrar por sitio
    const response = await fetch(purchasesUrl, {
      headers: {
        'Accept': 'application/json',
      },
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
      
      console.error('❌ Error del backend:', response.status, serverBody);
      return NextResponse.json(serverBody, { status: response.status });
    }
    
    const data = await response.json();
    console.log(`✅ ${data.length} compras obtenidas`);
    return NextResponse.json(data);
    
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ Error de conexión al backend:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error('❌ Error en GET /api/purchases:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Verificar que existe site_id
    if (!body.site_id) {
      return NextResponse.json(
        { error: 'Se requiere site_id' },
        { status: 400 }
      );
    }
    
    console.log('📤 Creando compra:', body);
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const createPurchasesUrl = `${baseUrl}/purchases`;
    
    const response = await fetch(createPurchasesUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Error del backend:', response.status, errorData);
      return NextResponse.json(
        errorData || { error: `Error del servidor: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Compra creada:', data.id);
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('❌ Error en POST /api/purchases:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}
