import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3000";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('Logging in user:', body.email);

    const response = await fetch(`${API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
      body: JSON.stringify(body),
    });

    console.log('Login response status:', response.status);

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