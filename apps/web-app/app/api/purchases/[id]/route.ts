import { NextRequest, NextResponse } from 'next/server';

// En el servidor usamos API_URL (sin NEXT_PUBLIC_)
const API_URL = process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de compra no válido' },
        { status: 400 }
      );
    }
    
    console.log('📥 Obteniendo compra:', id);
    
    const response = await fetch(`${API_URL}/purchases/${id}`);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('❌ Error del backend:', response.status, errorText);
      return NextResponse.json(
        { error: `Error del servidor: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    console.log('✅ Compra obtenida:', data.id);
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('❌ Error en GET /api/purchases/[id]:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    const body = await request.json();
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de compra no válido' },
        { status: 400 }
      );
    }
    
    console.log('📤 Actualizando compra:', id, body);
    
    const response = await fetch(`${API_URL}/purchases/${id}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        errorData || { error: `Error del servidor: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error actualizando compra:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de compra no válido' },
        { status: 400 }
      );
    }
    
    console.log('🗑️ Eliminando compra:', id);
    
    const response = await fetch(`${API_URL}/purchases/${id}`, {
      method: 'DELETE',
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      console.error('❌ Error del backend al eliminar:', errorData);
      return NextResponse.json(
        errorData || { error: `Error del servidor: ${response.status}` },
        { status: response.status }
      );
    }
    
    console.log('✅ Compra eliminada exitosamente:', id);
    return new NextResponse(null, { status: 204 });
    
  } catch (error) {
    console.error('❌ Error eliminando compra:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  request: NextRequest,
  context: { params: { id: string } }
) {
  try {
    const id = context.params?.id; // Acceder a través de context sin desestructurar
    
    if (!id) {
      return NextResponse.json(
        { error: 'ID de compra no válido' },
        { status: 400 }
      );
    }
    const body = await request.json();
    
    // Resto del código sin cambios
    const response = await fetch(`${API_URL}/purchases/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      return NextResponse.json(
        errorData || { error: `Error del servidor: ${response.status}` },
        { status: response.status }
      );
    }
    
    const data = await response.json();
    return NextResponse.json(data);
    
  } catch (error) {
    console.error('Error actualizando compra:', error);
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    );
  }
}