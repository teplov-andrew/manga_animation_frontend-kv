import { NextResponse } from "next/server"

export const maxDuration = 600 // 10 minutes

export async function POST(request: Request) {
  try {
    // Get the videos data and music from the request
    const data = await request.json()

    if (!data.videos || !Array.isArray(data.videos) || data.videos.length === 0) {
      return NextResponse.json({ error: "No video URLs provided" }, { status: 400 })
    }

    console.log(`Creating anime with ${data.videos.length} videos${data.music ? " and music" : ""}`)

    // Create a FormData object with the JSON data
    const formData = new FormData()

    // Log the music URL if provided
    if (data.music) {
      console.log("Including music track in anime creation (S3 URL):", data.music)
    }

    // Convert the JSON data to a file
    const jsonBlob = new Blob(
      [
        JSON.stringify({
          videos: data.videos,
          music: data.music || null, // This ensures the S3 URL is included
          settings: data.settings || {},
        }),
      ],
      { type: "application/json" },
    )
    formData.append("file", jsonBlob, "videos.json")

    // Create a controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

    try {
      // Forward the request to the external API
      const response = await fetch("https://c307-212-34-142-81.ngrok-free.app/create_anime/", {
        method: "POST",
        body: formData,
        signal: controller.signal,
        headers: {
          Accept: "application/json",
        },
      })

      // Clear the timeout
      clearTimeout(timeoutId)

      if (!response.ok) {
        const errorText = await response.text().catch(() => "Unknown error")
        console.error(`API responded with status: ${response.status}, error: ${errorText}`)
        throw new Error(`API error: ${response.status} - ${errorText}`)
      }

      const responseData = await response.json()
      console.log("Successfully created anime video", responseData)

      // Check if we have a file_url in the response
      if (!responseData.file_url) {
        throw new Error("No file URL in API response")
      }

      // Return the response with the video URL
      return NextResponse.json({
        success: true,
        file_url: responseData.file_url,
        file_name: responseData.file_name || "anime-video.mp4",
      })
    } catch (apiError) {
      // Clear the timeout
      clearTimeout(timeoutId)

      console.error("Error calling create_anime API:", apiError)
      return NextResponse.json(
        { error: `API error: ${apiError instanceof Error ? apiError.message : "Unknown error"}` },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in create-anime route:", error)
    return NextResponse.json(
      { error: "Failed to create anime", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
