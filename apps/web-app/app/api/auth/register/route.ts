import { NextRequest, NextResponse } from 'next/server';
import { getApiUrl } from '@/lib/apiConfig';

const API_URL = getApiUrl();

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Registering user with data:', { ...body, password: '[HIDDEN]' });
    console.log('API URL:', API_URL);

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Registration response status:', response.status);
    console.log('Registration response Content-Type:', response.headers.get('content-type'));

    // Verificar si la respuesta es JSON antes de intentar parsearla
    const contentType = response.headers.get('content-type');
    let result;

    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // Si no es JSON, probablemente es HTML (página 404)
      const text = await response.text();
      console.error('Non-JSON response received:', text.substring(0, 200));
      
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'Servidor no encontrado',
            message: `No se pudo conectar con el servidor en ${API_URL}. Verifica que el servidor esté corriendo.` 
          },
          { status: 503 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error del servidor',
          message: 'El servidor respondió con un formato inesperado' 
        },
        { status: 500 }
      );
    }

    if (!response.ok) {
      console.error('Registration error from backend:', result);
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Registration successful');
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    
    // Si es un error de conexión (fetch falla)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      return NextResponse.json(
        { 
          error: 'Error de conexión',
          message: `No se pudo conectar con el servidor en ${API_URL}. Verifica que el servidor esté corriendo.` 
        },
        { status: 503 }
      );
    }
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}