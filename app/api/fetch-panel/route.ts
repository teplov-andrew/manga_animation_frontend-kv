import { NextResponse } from "next/server"

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const panelPath = searchParams.get("path")

  if (!panelPath) {
    return NextResponse.json({ error: "Panel path is required" }, { status: 400 })
  }

  try {
    // In a real implementation, this would fetch the image from the server
    // For now, we'll return a placeholder
    return NextResponse.json({
      imageUrl: `/placeholder.svg?text=Panel&width=300&height=400`,
    })
  } catch (error) {
    console.error("Error fetching panel:", error)
    return NextResponse.json({ error: "Failed to fetch panel" }, { status: 500 })
  }
}
