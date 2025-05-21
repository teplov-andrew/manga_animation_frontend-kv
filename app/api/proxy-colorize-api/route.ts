import { NextResponse } from "next/server"

export const maxDuration = 600 // 10 minutes

// Simple in-memory store for tracking ongoing requests
const ongoingRequests = new Map()

// Update the POST function to ensure we're properly handling the base64 data
export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()

    // Create a request identifier based on timestamp
    const timestamp = (formData.get("timestamp") as string) || Date.now().toString()
    const requestId = `colorize-${timestamp}`

    // Check if there's already an ongoing request with the same ID
    if (ongoingRequests.has(requestId)) {
      console.log(`Request ${requestId} is already in progress, returning status`)
      return NextResponse.json(
        { status: "in_progress", message: "This request is already being processed" },
        { status: 202 },
      )
    }

    // Mark this request as ongoing
    ongoingRequests.set(requestId, Date.now())

    // Log the request for debugging
    console.log("Proxying colorization request to API")

    // Implement retry mechanism
    const MAX_RETRIES = 3
    let retryCount = 0
    let lastError = null

    while (retryCount < MAX_RETRIES) {
      try {
        console.log(`Attempt ${retryCount + 1} to call colorize API`)

        // Create a controller for timeout
        const controller = new AbortController()
        const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

        // Forward the request to the external API
        const response = await fetch("https://152f-213-159-64-202.ngrok-free.app/colorize/", {
          method: "POST",
          body: formData,
          signal: controller.signal,
          headers: {
            Connection: "keep-alive",
            "Cache-Control": "no-cache",
          },
        })

        // Clear the timeout
        clearTimeout(timeoutId)

        if (!response.ok) {
          console.error(`API responded with status: ${response.status}`)
          throw new Error(`API responded with status: ${response.status}`)
        }

        const data = await response.json()
        console.log("Successfully received response from colorize API")

        // Log the first part of the colorized image data to verify it's being received correctly
        if (data.colorized_image) {
          console.log(
            "Received colorized image data (first 50 chars):",
            typeof data.colorized_image === "string" ? data.colorized_image.substring(0, 50) + "..." : "Not a string",
          )
        } else {
          console.log("No colorized_image field in response")
        }

        // Remove from ongoing requests map when done
        ongoingRequests.delete(requestId)

        // Return the response from the external API
        return NextResponse.json(data)
      } catch (apiError) {
        lastError = apiError
        console.error(
          `Attempt ${retryCount + 1} failed: ${apiError instanceof Error ? apiError.message : "Unknown error"}`,
        )

        // If it's an abort error (timeout), log it specifically
        if (apiError instanceof Error && apiError.name === "AbortError") {
          console.error("Request timed out after 5 minutes")
        }

        // Increment retry count
        retryCount++

        // If we haven't reached max retries, wait before trying again
        if (retryCount < MAX_RETRIES) {
          console.log(`Waiting before retry ${retryCount + 1}...`)
          await new Promise((resolve) => setTimeout(resolve, 5000)) // Wait 5 seconds before retrying
        }
      }
    }

    // Remove from ongoing requests map on error
    ongoingRequests.delete(requestId)

    // If we've exhausted all retries, return an error
    console.error(`Failed after ${MAX_RETRIES} attempts to call colorize API:`, lastError)

    // Create a fallback response with mock data
    // This allows the frontend to continue working even if the API is down
    return NextResponse.json(
      {
        error: `API error after ${MAX_RETRIES} attempts: ${lastError instanceof Error ? lastError.message : "Unknown error"}`,
        colorized_image: null, // This will trigger the fallback in the frontend
      },
      { status: 500 },
    )
  } catch (error) {
    console.error("Error in proxy-colorize-api route:", error)
    return NextResponse.json(
      { error: "Failed to colorize image", details: error instanceof Error ? error.message : "Unknown error" },
      { status: 500 },
    )
  }
}
