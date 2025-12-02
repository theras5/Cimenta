import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function DELETE(request: NextRequest) {
  try {
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No se proporcionó token de autenticación' },
        { status: 401 }
      );
    }

    console.log('Eliminando avatar del usuario...');

    const response = await fetch(`${API_URL}/storage/delete-profile-picture`, {
      method: 'DELETE',
      headers: {
        'Authorization': authHeader,
      },
    });

    console.log('Delete response status:', response.status);

    const result = await response.json();

    if (!response.ok) {
      console.error('Delete error from backend:', result);
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Avatar deleted successfully');
    return NextResponse.json(result);

  } catch (error) {
    console.error('Delete API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
