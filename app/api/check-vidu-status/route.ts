import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Get the status URL from the query parameters
    const { searchParams } = new URL(request.url)
    const statusUrl = searchParams.get("url")

    if (!statusUrl) {
      return NextResponse.json({ error: "No status URL provided" }, { status: 400 })
    }

    console.log(`Checking VIDU task status at: ${statusUrl}`)

    // Fetch the status from the VIDU API
    const response = await fetch(statusUrl, {
      headers: {
        "Cache-Control": "no-cache, no-store, must-revalidate",
        Pragma: "no-cache",
        Expires: "0",
      },
    })

    if (!response.ok) {
      console.error(`Status API responded with status: ${response.status}`)
      throw new Error(`Status API error: ${response.status}`)
    }

    const data = await response.json()
    console.log("Status response:", data)

    // Return the status response to the client
    return NextResponse.json(data)
  } catch (error) {
    console.error("Error checking VIDU task status:", error)
    return NextResponse.json(
      {
        error: "Failed to check task status",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
