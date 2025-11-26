import { NextResponse } from "next/server";

const API_URL = 'http://localhost:3000';

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${API_URL}/assigned-to/task/${id}`);
    
    if (!response.ok) {
      throw new Error("Failed to fetch workers by task");
    }
    
    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching workers by task:", error);
    return NextResponse.json(
      { error: "Failed to fetch workers by task" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const response = await fetch(`${API_URL}/assigned-to/task/${id}`, {
      method: "DELETE",
    });
    
    if (!response.ok) {
      throw new Error("Failed to unassign all workers from task");
    }
    
    return new NextResponse(null, { status: 204 });
  } catch (error) {
    console.error("Error unassigning all workers from task:", error);
    return NextResponse.json(
      { error: "Failed to unassign all workers from task" },
      { status: 500 }
    );
  }
}