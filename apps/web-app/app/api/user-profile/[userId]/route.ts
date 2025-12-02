import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function GET(
  request: NextRequest,
  { params }: { params: { userId: string } }
) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No se proporcionó token de autenticación' },
        { status: 401 }
      );
    }

    const { userId } = params;

    console.log('Obteniendo perfil del usuario:', userId);

    const response = await fetch(`${API_URL}/storage/user-profile/${userId}`, {
      method: 'GET',
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log('Get profile response status:', response.status);

    const result = await response.json();

    if (!response.ok) {
      console.error('Get profile error from backend:', result);
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Profile retrieved successfully');
    return NextResponse.json(result);

  } catch (error) {
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
