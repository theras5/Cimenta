import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Registering user with data:', { ...body, password: '[HIDDEN]' });

    const response = await fetch(`${API_URL}/auth/register`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Registration response status:', response.status);

    const result = await response.json();

    if (!response.ok) {
      console.error('Registration error from backend:', result);
      return NextResponse.json(result, { status: response.status });
    }

    console.log('Registration successful');
    return NextResponse.json(result, { status: 201 });

  } catch (error) {
    console.error('Registration API error:', error);
    
    return NextResponse.json(
      { 
        error: 'Error interno del servidor', 
        message: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}