import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Registering user with data:', { ...body, password: '[HIDDEN]' });
    console.log('API_URL:', API_URL);
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const registerUrl = `${baseUrl}/auth/register`;
    console.log('Calling register endpoint:', registerUrl);

    const response = await fetch(registerUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Registration response status:', response.status);
    console.log('Registration response headers:', Object.fromEntries(response.headers.entries()));

    // Verificar el Content-Type antes de parsear
    const contentType = response.headers.get('content-type');
    let result;
    
    if (contentType && contentType.includes('application/json')) {
      result = await response.json();
    } else {
      // Si no es JSON, leer como texto para ver qué devolvió
      const text = await response.text();
      console.error('Response is not JSON. Content-Type:', contentType);
      console.error('Response body (first 500 chars):', text.substring(0, 500));
      
      // Si es un 404, probablemente la ruta no existe
      if (response.status === 404) {
        return NextResponse.json(
          { 
            error: 'Ruta no encontrada',
            message: `El servidor no encontró la ruta ${registerUrl}. Verifica que el servidor esté corriendo y que la URL sea correcta.`
          },
          { status: 404 }
        );
      }
      
      return NextResponse.json(
        { 
          error: 'Error del servidor',
          message: `El servidor devolvió un formato inesperado (${contentType}). Status: ${response.status}`
        },
        { status: response.status || 500 }
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
    
    // Si es un error de red (fetch falló), dar un mensaje más claro
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