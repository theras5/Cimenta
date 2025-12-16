import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ userId: string }> }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No se proporcionó token de autenticación' },
        { status: 401 }
      );
    }

    const { userId } = await params;

    console.log('Obteniendo perfil del usuario:', userId);

    const response = await fetch(`${API_URL}/storage/user-profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log('Get profile response status:', response.status);

    // Check response status before parsing JSON
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
      
      console.error('Get profile error from backend:', errorBody);
      return NextResponse.json(errorBody, { status: response.status });
    }

    const result = await response.json();
    console.log('Profile retrieved successfully');
    return NextResponse.json(result);

  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Error de conexión al backend:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error('Get profile API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
