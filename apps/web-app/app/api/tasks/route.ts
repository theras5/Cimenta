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
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const tasksUrl = `${baseUrl}/tasks/site/${siteId}`;
    console.log('Calling tasks endpoint:', tasksUrl);
    
    // Hacer la petición al backend filtrando por site_id
    const response = await fetch(tasksUrl, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
    if (!response.ok) {
      // Intentar leer el cuerpo de error del backend
      let serverBody: any;
      const contentType = response.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          serverBody = await response.json();
        } else {
          serverBody = { error: await response.text() };
        }
      } catch (e) {
        serverBody = { error: `Error del servidor: ${response.status}` };
      }
      
      console.error('Backend /tasks/site returned error', response.status, serverBody);
      return NextResponse.json(serverBody, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('Error de conexión al backend:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error('Error en API de tareas:', error);
    return NextResponse.json(
      { 
        error: 'Error interno del servidor',
        message: error instanceof Error ? error.message : 'Unknown error'
      },
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
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const createTasksUrl = `${baseUrl}/tasks`;
    
    const response = await fetch(createTasksUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    // If backend returned an error, try to forward the real body and status
    if (!response.ok) {
      let serverBody: any;
      const contentType = response.headers.get('content-type') || '';
      try {
        if (contentType.includes('application/json')) {
          serverBody = await response.json();
        } else {
          serverBody = await response.text();
        }
      } catch (e) {
        serverBody = { error: 'No se pudo leer el cuerpo del error del backend' };
      }

      console.error('Backend /tasks returned error', response.status, serverBody);
      return NextResponse.json(serverBody, { status: response.status });
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