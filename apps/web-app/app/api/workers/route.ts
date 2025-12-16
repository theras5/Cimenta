import { NextResponse } from "next/server";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function GET(request: Request) {
  try {
    // Obtener parámetros de búsqueda
    const { searchParams } = new URL(request.url);
    const employerId = searchParams.get('employerId');

    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    let url = `${baseUrl}/workers`;
    
    // Si hay employerId, filtrar por empleador
    if (employerId) {
      url = `${baseUrl}/workers/employer/${employerId}`;
    }

    console.log('📤 [workers] Calling backend:', url);
    
    const response = await fetch(url, {
      headers: {
        'Accept': 'application/json',
      },
    });
    
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
      
      console.error('❌ [workers] Backend error:', response.status, errorBody);
      return NextResponse.json(errorBody, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [workers] Connection error:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error("❌ [workers] Error:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    console.log('📥 [workers] POST - Request body:', body);
    
    // Normalizar la URL para evitar dobles barras
    const baseUrl = API_URL.endsWith('/') ? API_URL.slice(0, -1) : API_URL;
    const workersUrl = `${baseUrl}/workers`;
    
    console.log('📤 [workers] POST - Calling backend:', workersUrl);
    console.log('📤 [workers] POST - API_URL env:', API_URL);
    
    const response = await fetch(workersUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    console.log('📥 [workers] POST - Backend response status:', response.status);
    console.log('📥 [workers] POST - Backend response headers:', Object.fromEntries(response.headers.entries()));
    
    if (!response.ok) {
      let errorData: any;
      const contentType = response.headers.get('content-type') || '';
      console.log('📥 [workers] POST - Response content-type:', contentType);
      
      try {
        if (contentType.includes('application/json')) {
          errorData = await response.json();
        } else {
          const text = await response.text();
          console.log('📥 [workers] POST - Response text (first 200 chars):', text.substring(0, 200));
          errorData = { error: text };
        }
      } catch (e) {
        console.error('❌ [workers] POST - Error parsing error response:', e);
        errorData = { error: `Error del servidor: ${response.status}` };
      }
      
      console.error('❌ [workers] POST - Backend error:', response.status, errorData);
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    console.log('✅ [workers] POST - Worker created successfully:', data);
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    // Handle connection errors separately
    if (error instanceof TypeError && error.message.includes('fetch')) {
      console.error('❌ [workers] POST - Connection error:', error);
      return NextResponse.json(
        { error: 'No se pudo conectar con el servidor. Verifica que el servidor esté corriendo.' },
        { status: 503 }
      );
    }
    
    console.error("❌ [workers] POST - Error:", error);
    return NextResponse.json(
      { 
        error: "Error interno del servidor",
        message: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}