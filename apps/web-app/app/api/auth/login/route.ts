import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/apiConfig';

const API_URL = getApiUrl();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Logging in user:', body.email);
    console.log('API URL:', API_URL);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Login response status:', response.status);

    // Check if response is JSON
    const contentType = response.headers.get('content-type');
    if (!contentType || !contentType.includes('application/json')) {
      console.error('Backend returned non-JSON response:', contentType);
      const text = await response.text();
      console.error('Response body:', text.substring(0, 200));
      return NextResponse.json(
        { error: 'Error de configuración del servidor. Verifica que el backend esté corriendo.' },
        { status: 500 }
      );
    }

    const result = await response.json();

    if (!response.ok) {
      console.error('Login error from backend:', result);
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Login successful for user:', body.email);
    return NextResponse.json(result);

  } catch (error) {
    console.error('Login API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}