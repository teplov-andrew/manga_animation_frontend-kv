import { NextResponse } from "next/server"

export const maxDuration = 600 // 10 minutes

// Add at the top of the file, outside the POST function
// Simple in-memory store for tracking ongoing requests
const ongoingRequests = new Map()

// Replace the entire POST function with this improved version
export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    const model = (formData.get("model") as string) || "vidu"

    // Create a request identifier based on model and timestamp
    const timestamp = (formData.get("timestamp") as string) || Date.now().toString()
    const requestId = `${model}-${timestamp}`

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

    // Log the request details
    console.log(`Proxying animation request to ${model} API`)

    // Determine which API to use based on the model
    const apiUrl =
      model === "vidu"
        ? "https://dbdb-212-34-143-63.ngrok-free.app/vidu_animate/"
        : model === "wan"
          ? "https://dbdb-212-34-143-63.ngrok-free.app/wan_animate/"
          : model === "cogvideox"
            ? "https://dbdb-212-34-143-63.ngrok-free.app/vidu_animate/" // Temporarily use vidu endpoint until cogvideox is implemented
            : "https://dbdb-212-34-143-63.ngrok-free.app/wan_animate/"

    try {
      console.log(`Calling ${model} API at ${apiUrl}`)
      if (model === "cogvideox") {
        console.log("Note: CogVideoX model is currently a placeholder and will use VIDU endpoint")
      }

      // Extract the file from formData
      const file = formData.get("file")
      const prompt = formData.get("prompt") || ""

      if (!file || !(file instanceof Blob)) {
        throw new Error("No file found in form data or file is not a Blob")
      }

      console.log(`File details for animation: type=${file.type}, size=${file.size} bytes`)
      console.log(`Using ${file.size > 500000 ? "colorized" : "original"} panel for animation based on file size`)
      console.log(`Prompt: ${prompt}`)

      // Create a new FormData object with just the essential fields
      const newFormData = new FormData()

      // Ensure we're sending the file with the correct name and type
      // Some APIs are strict about the file field name and file extension
      newFormData.append("file", file, "image.png")
      newFormData.append("prompt", prompt as string)

      // Add a fallback mechanism - if the API is unavailable, use a mock response
      try {
        // Send the initial request to start the animation task
        const response = await fetch(apiUrl, {
          method: "POST",
          body: newFormData,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        console.log(`API responded with status: ${response.status}`)

        // If the response is not OK, try to get more detailed error information
        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error details")
          console.error(`API error response: ${errorText}`)
          throw new Error(`API responded with status: ${response.status} - ${errorText}`)
        }

        const responseData = await response.json()
        console.log("Initial API response:", responseData)

        // For VIDU model, handle the new task-based workflow
        if (model === "vidu") {
          if (responseData.task_id && responseData.status_url) {
            console.log(`Task created with ID: ${responseData.task_id}`)
            console.log(`Status URL: ${responseData.status_url}`)

            // Return the task information to the client for polling
            ongoingRequests.delete(requestId)
            return NextResponse.json({
              success: true,
              task: {
                id: responseData.task_id,
                statusUrl: `https://dbdb-212-34-143-63.ngrok-free.app${responseData.status_url}`,
                model: "vidu",
              },
            })
          } else {
            throw new Error("Invalid response format: missing task_id or status_url")
          }
        }
        // For WAN model, handle the regular response format
        else {
          // Check for different response formats
          if (responseData.video?.url) {
            console.log("Found video URL in standard format:", responseData.video.url)
            ongoingRequests.delete(requestId)
            return NextResponse.json({
              success: true,
              video: {
                url: responseData.video.url,
              },
            })
          } else if (responseData.file_url) {
            console.log("Found file_url in response:", responseData.file_url)
            ongoingRequests.delete(requestId)
            return NextResponse.json({
              success: true,
              video: {
                url: responseData.file_url,
              },
            })
          } else {
            throw new Error("No video URL found in response")
          }
        }
      } catch (apiError) {
        console.error("Error calling animation API:", apiError)

        // Return a fallback response for the client to handle
        ongoingRequests.delete(requestId)
        return NextResponse.json(
          {
            success: false,
            error: `API error: ${apiError instanceof Error ? apiError.message : "Unknown error"}`,
            status: "error",
            fallback: true,
            message: "Using fallback animation mode due to API unavailability",
            timestamp: new Date().toISOString(),
          },
          { status: 200 },
        ) // Return 200 so the client can handle the fallback
      }
    } catch (apiError) {
      console.error("Error calling animation API:", apiError)
      ongoingRequests.delete(requestId)

      return NextResponse.json(
        {
          error: `API error: ${apiError instanceof Error ? apiError.message : "Unknown error"}`,
          status: "error",
          fallback: true,
          timestamp: new Date().toISOString(),
        },
        { status: 200 }, // Return 200 so the client can handle the fallback
      )
    }
  } catch (error) {
    console.error("Error in proxy-animation-api route:", error)
    return NextResponse.json(
      {
        error: "Failed to process animation request",
        details: error instanceof Error ? error.message : "Unknown error",
        status: "error",
        fallback: true,
        timestamp: new Date().toISOString(),
      },
      { status: 200 }, // Return 200 so the client can handle the fallback
    )
  }
}
