import { NextResponse } from "next/server";

const API_URL = 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/assigned-to/multiple`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      const errorData = await response.json();
      return NextResponse.json(errorData, { status: response.status });
    }
    
    const data = await response.json();
    return NextResponse.json(data, { status: 201 });
  } catch (error) {
    console.error("Error assigning multiple workers:", error);
    return NextResponse.json(
      { error: "Failed to assign multiple workers" },
      { status: 500 }
    );
  }
}