import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(request: NextRequest) {
  try {
    // Obtener el site_id de los query params
    const { searchParams } = new URL(request.url);
    const siteId = searchParams.get('site_id');
    
    if (!siteId) {
      return NextResponse.json(
        { error: 'Se requiere site_id' },
        { status: 400 }
      );
    }
    
    // Hacer la petición al backend filtrando por site_id
    const response = await fetch(`${API_URL}/tasks/site/${siteId}`, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error en API de tareas:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

// POST para crear tareas
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
    
    const response = await fetch(`${API_URL}/tasks`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error(`Error del servidor: ${response.status}`);
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
    
  } catch (error) {
    console.error('Error en API de tareas (POST):', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}