import { NextResponse } from "next/server";

const API_URL = 'http://localhost:3000';

export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/assigned-to`, {
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
    console.error("Error assigning worker to task:", error);
    return NextResponse.json(
      { error: "Failed to assign worker to task" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const body = await request.json();
    
    const response = await fetch(`${API_URL}/assigned-to`, {
      method: "DELETE",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });
    
    if (!response.ok) {
      throw new Error("Failed to unassign worker from task");
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error unassigning worker from task:", error);
    return NextResponse.json(
      { error: "Failed to unassign worker from task" },
      { status: 500 }
    );
  }
}