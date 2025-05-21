import { NextResponse } from "next/server"

export const maxDuration = 600 // 10 minutes

// Update the POST function to ensure we're preserving color information
export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    const effect = (formData.get("effect") as string) || "zoom"

    // Log the form data to see what we're sending
    console.log("Manual animation request for effect:", effect)

    // Check if we have a file in the form data
    const file = formData.get("file")
    if (file) {
      console.log(
        "File included in request:",
        file instanceof File
          ? {
              name: file.name,
              type: file.type,
              size: file.size,
            }
          : "Not a File object",
      )
    } else {
      console.log("No file found in form data")
    }

    // Determine which API to use based on the effect
    let apiUrl = "https://152f-213-159-64-202.ngrok-free.app/manual_zoom/"

    if (effect === "reveal") {
      apiUrl = "https://152f-213-159-64-202.ngrok-free.app/manual_reveal/"
    } else if (effect === "shake") {
      apiUrl = "https://152f-213-159-64-202.ngrok-free.app/manual_shake/"
    }

    console.log(`Proxying manual animation request to ${apiUrl} for effect: ${effect}`)

    try {
      // Create a new FormData object to ensure we're sending the file with the correct content type
      const newFormData = new FormData()

      // If we have a file, ensure it's sent with the correct content type
      if (file instanceof File) {
        // Explicitly set the content type to image/png to preserve color information
        newFormData.append("file", file, "colorized_panel.png")
      } else {
        // If no file, just pass along the original form data
        newFormData.append("file", formData.get("file") as Blob, "colorized_panel.png")
      }

      // Add any other form data fields
      for (const [key, value] of formData.entries()) {
        if (key !== "file") {
          newFormData.append(key, value)
        }
      }

      // Forward the request to the external API
      const response = await fetch(apiUrl, {
        method: "POST",
        body: newFormData,
        signal: AbortSignal.timeout(180000), // 3 minute timeout
        headers: {
          // Add cache control headers to prevent caching issues
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      // Log the response status
      console.log(`API responded with status: ${response.status}`)

      if (!response.ok) {
        console.error(`API responded with status: ${response.status}`)
        throw new Error(`API error: ${response.status}`)
      }

      // Get the full response text for debugging
      const responseText = await response.text()
      console.log("Response text length:", responseText.length)

      // Try to parse the response as JSON
      let data
      try {
        data = JSON.parse(responseText)
        console.log("Successfully parsed response as JSON")
      } catch (parseError) {
        console.error("Failed to parse response as JSON:", parseError)
        throw new Error("Invalid JSON response from API")
      }

      console.log("Successfully received response from manual animation API")

      // Return the response from the external API
      return NextResponse.json(data)
    } catch (apiError) {
      console.error("Error calling external manual animation API:", apiError)

      // Create a fallback response with error details
      return NextResponse.json(
        {
          error: `API error: ${apiError instanceof Error ? apiError.message : "Unknown error"}`,
        },
        { status: 500 },
      )
    }
  } catch (error) {
    console.error("Error in proxy-manual-animation route:", error)
    return NextResponse.json(
      {
        error: "Failed to process manual animation request",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
