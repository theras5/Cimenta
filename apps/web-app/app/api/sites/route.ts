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
    const body = await request.json();
    
    // Validaciones básicas
    if (!body.address || !body.user_id) {
      return NextResponse.json(
        { error: 'Dirección y ID de usuario son obligatorios' },
        { status: 400 }
      );
    }
    
    const response = await fetch(`${API_URL}/sites`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Error desconocido' }));
      return NextResponse.json(
        errorData,
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error('Error al crear sitio:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}