import { NextResponse } from "next/server"

export const maxDuration = 600 // 10 minutes

export async function POST(request: Request) {
  try {
    // Get the request body
    const body = await request.json()
    const { videoUrls, mergeSettings, musicUrl } = body

    if (!videoUrls || !Array.isArray(videoUrls) || videoUrls.length === 0) {
      return NextResponse.json({ error: "No video URLs provided" }, { status: 400 })
    }

    console.log("Merging videos with settings:", mergeSettings)
    console.log("Video URLs:", videoUrls)
    if (musicUrl) {
      console.log("Music URL:", musicUrl)
    }

    // Create a FormData object with the JSON data
    const formData = new FormData()

    // Convert the JSON data to a file
    const jsonBlob = new Blob(
      [
        JSON.stringify({
          videos: videoUrls,
          music: musicUrl || null,
          settings: mergeSettings || {},
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
      const response = await fetch("https://152f-213-159-64-202.ngrok-free.app/create_anime/", {
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
        console.error(`API responded with status: ${response.status}`)
        throw new Error(`API error: ${response.status}`)
      }

      const data = await response.json()
      console.log("Successfully created anime video", data)

      if (!data.file_url) {
        throw new Error("No file URL in response")
      }

      // Return the merged video data
      return NextResponse.json({
        success: true,
        mergedVideoData: {
          file_url: data.file_url,
          file_name: data.file_name || "anime-video.mp4",
        },
        message: `Successfully created anime "${mergeSettings?.title || "Untitled"}" with ${videoUrls.length} clips`,
      })
    } catch (apiError) {
      // Clear the timeout
      clearTimeout(timeoutId)

      // If the API call fails, fall back to the preview approach
      console.error("Error calling create_anime API:", apiError)

      // Return a fallback response that contains individual video URLs for preview
      return NextResponse.json({
        success: true,
        mergedVideoData: {
          videos: videoUrls,
          settings: mergeSettings,
          timestamp: Date.now(),
        },
        message: "Using preview mode. API error: " + (apiError instanceof Error ? apiError.message : String(apiError)),
      })
    }
  } catch (error) {
    console.error("Error merging videos:", error)
    return NextResponse.json(
      { error: "Failed to merge videos", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
