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
    
    const response = await fetch(`${API_URL}/sites/user/${userId}`, {
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Cambié de next.revalidate a cache no-store
    });
    
    if (!response.ok) {
      console.error(`Backend responded with status: ${response.status}`);
      return NextResponse.json(
        { error: 'Error al obtener sitios del usuario' },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log(`Successfully fetched ${data.length || 0} sites`);
    return NextResponse.json(data);
  } catch (error) {
    console.error(`Error al obtener sitios del usuario:`, error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}