import { NextResponse } from "next/server";

const API_URL = 'http://localhost:3000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${API_URL}/assigned-to/worker/${id}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch tasks by worker");
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching tasks by worker:", error);
    return NextResponse.json(
      { error: "Failed to fetch tasks by worker" },
      { status: 500 }
    );
  }
}