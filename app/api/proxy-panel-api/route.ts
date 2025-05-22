import { NextResponse } from "next/server"

export const maxDuration = 600 // 10 minutes

export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()

    // Log the request for debugging
    console.log("Proxying panel detection request to API")

    try {
      // Forward the request to the external API - using the correct endpoint
      const response = await fetch("https://dbdb-212-34-143-63.ngrok-free.app/crop_panels/", {
        method: "POST",
        body: formData,
        // Increase timeout from 15000ms to 120000ms (2 minutes)
        signal: AbortSignal.timeout(120000), // 2 minute timeout
        // Add cache control headers to prevent caching issues
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
          "X-Preserve-Color": "true", // Add this header to signal that color should be preserved
        },
      })

      if (!response.ok) {
        console.error(`API responded with status: ${response.status}`)
        throw new Error(`API responded with status: ${response.status}`)
      }

      const data = await response.json()
      console.log("Successfully received response from panel API")

      // Add a log to check the response format
      console.log("Panel API response received, checking for color preservation")

      // Check if the response has panel_crops array
      if (data.panel_crops && Array.isArray(data.panel_crops)) {
        console.log(`Found ${data.panel_crops.length} panel crops in response, ensuring color is preserved`)

        // Ensure the panel_crops are properly formatted with color information
        const panelCrops = data.panel_crops.map((crop: string) => {
          // Make sure the base64 string has the proper prefix if it doesn't already
          if (typeof crop === "string") {
            return crop.startsWith("data:image/") ? crop : `data:image/png;base64,${crop}`
          }
          return crop
        })

        return NextResponse.json({
          success: true,
          panel_crops: panelCrops,
        })
      } else {
        console.log("No panel_crops found in response, checking for other formats")

        // Check for panel_urls as a fallback
        const imageUrls = []

        // Check if the response has a panels array
        if (data.panels && Array.isArray(data.panels)) {
          console.log("Found panels array in response:", data.panels)
          imageUrls.push(...data.panels)
        }
        // Check for img1, img2, etc. format
        else {
          for (let i = 1; i <= 20; i++) {
            // Check up to 20 possible images
            const key = `img${i}`
            if (data[key]) {
              imageUrls.push(data[key])
            }
          }
        }

        if (imageUrls.length > 0) {
          return NextResponse.json({
            success: true,
            panel_urls: imageUrls,
          })
        } else {
          console.log("No panels found in response, using fallback")
          return NextResponse.json({
            success: false,
            error: "No panels found in API response",
            panel_crops: [], // Empty array will trigger the fallback in the frontend
          })
        }
      }
    } catch (apiError) {
      console.error("Error calling external panel API:", apiError)

      // Create a fallback response
      return NextResponse.json(
        {
          success: false,
          error: "API error, using fallback",
          panel_crops: [], // Empty array will trigger the fallback in the frontend
          details: apiError instanceof Error ? apiError.message : "Unknown error",
        },
        { status: 200 }, // Return 200 status to allow frontend to handle the error gracefully
      )
    }
  } catch (error) {
    console.error("Error in proxy-panel-api route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process image",
        details: error instanceof Error ? error.message : "Unknown error",
        panel_crops: [], // Include empty panel_crops to ensure consistent response format
      },
      { status: 200 }, // Return 200 status to allow frontend to handle the error gracefully
    )
  }
}
