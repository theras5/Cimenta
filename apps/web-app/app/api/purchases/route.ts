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
    
    // Endpoint específico para filtrar por sitio
    const response = await fetch(`${API_URL}/purchases/site/${siteId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error del backend:', response.status, errorText);
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    console.log(`✅ ${data.length} compras obtenidas`);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error en GET /api/purchases:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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
    
    const response = await fetch(`${API_URL}/purchases`, {
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
