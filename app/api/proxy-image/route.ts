import { NextResponse } from "next/server"

export async function GET(request: Request) {
  try {
    // Get the URL from the query parameters
    const { searchParams } = new URL(request.url)
    const imageUrl = searchParams.get("url")

    if (!imageUrl) {
      return NextResponse.json({ error: "No URL provided" }, { status: 400 })
    }

    console.log(`Proxying image request for: ${imageUrl}`)

    // Fetch the image with improved error handling
    try {
      const response = await fetch(imageUrl, {
        headers: {
          // Add headers that might help with CORS
          Accept: "image/*, */*",
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36",
        },
      })

      if (!response.ok) {
        console.error(`Failed to fetch image: ${response.status} ${response.statusText}`)
        return NextResponse.json({ error: `Failed to fetch image: ${response.status}` }, { status: response.status })
      }

      // Get the image data
      const imageData = await response.arrayBuffer()
      const contentType = response.headers.get("content-type") || "image/jpeg"

      // Return the image with the correct content type and caching disabled
      return new NextResponse(imageData, {
        headers: {
          "Content-Type": contentType,
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "Access-Control-Allow-Origin": "*",
        },
      })
    } catch (fetchError) {
      console.error("Error fetching image:", fetchError)
      return NextResponse.json(
        { error: "Failed to fetch image", details: fetchError instanceof Error ? fetchError.message : "Unknown error" },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in proxy-image route:", error)
    return NextResponse.json(
      { error: "Failed to proxy image", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
