import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const authHeader = request.headers.get('Authorization');
    
    if (!authHeader) {
      return NextResponse.json(
        { error: 'No se proporcionó token de autenticación' },
        { status: 401 }
      );
    }

    console.log('Subiendo imagen al backend...');

    const response = await fetch(`${API_URL}/storage/upload-profile-picture`, {
      method: 'POST',
      headers: {
        'Authorization': authHeader,
      },
      body: formData as any,
    });

    console.log('Upload response status:', response.status);

    const result = await response.json();

    if (!response.ok) {
      console.error('Upload error from backend:', result);
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Upload successful:', result.url);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Upload API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
