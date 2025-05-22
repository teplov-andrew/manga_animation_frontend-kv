import { NextResponse } from "next/server"
import sharp from "sharp"

export const maxDuration = 600 // 10 minutes

export async function POST(request: Request) {
  try {
    // Get the form data from the request
    const formData = await request.formData()
    const file = formData.get("file")

    if (!file || !(file instanceof Blob)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 })
    }

    console.log("Received request to preserve color in panels")
    console.log(`File type: ${file.type}, size: ${file.size} bytes`)

    // Convert the file to a buffer
    const buffer = Buffer.from(await file.arrayBuffer())

    try {
      // Use sharp to process the image while preserving color
      const image = sharp(buffer)
      const metadata = await image.metadata()

      console.log(`Image format: ${metadata.format}, channels: ${metadata.channels}, space: ${metadata.space}`)

      // Ensure we're preserving color information
      let processedImage = image

      // If the image is grayscale, convert it to RGB to preserve any color that might be present
      if (metadata.channels === 1) {
        console.log("Converting grayscale image to RGB to preserve potential color")
        processedImage = image.toColorspace("srgb")
      }

      // Get the image dimensions
      const { width, height } = metadata

      if (!width || !height) {
        throw new Error("Could not determine image dimensions")
      }

      // Create mock panels by dividing the image into sections
      // This is a simple approach - in a real implementation, you'd use more sophisticated panel detection
      const panels = []

      // Add the full image as the first panel
      const fullImageBuffer = await processedImage.toBuffer()
      panels.push(`data:image/${metadata.format || "png"};base64,${fullImageBuffer.toString("base64")}`)

      // Create 4 panels by dividing the image into quadrants
      const halfWidth = Math.floor(width / 2)
      const halfHeight = Math.floor(height / 2)

      // Top-left quadrant
      const topLeftBuffer = await processedImage
        .extract({ left: 0, top: 0, width: halfWidth, height: halfHeight })
        .toBuffer()
      panels.push(`data:image/${metadata.format || "png"};base64,${topLeftBuffer.toString("base64")}`)

      // Top-right quadrant
      const topRightBuffer = await processedImage
        .extract({ left: halfWidth, top: 0, width: width - halfWidth, height: halfHeight })
        .toBuffer()
      panels.push(`data:image/${metadata.format || "png"};base64,${topRightBuffer.toString("base64")}`)

      // Bottom-left quadrant
      const bottomLeftBuffer = await processedImage
        .extract({ left: 0, top: halfHeight, width: halfWidth, height: height - halfHeight })
        .toBuffer()
      panels.push(`data:image/${metadata.format || "png"};base64,${bottomLeftBuffer.toString("base64")}`)

      // Bottom-right quadrant
      const bottomRightBuffer = await processedImage
        .extract({ left: halfWidth, top: halfHeight, width: width - halfWidth, height: height - halfHeight })
        .toBuffer()
      panels.push(`data:image/${metadata.format || "png"};base64,${bottomRightBuffer.toString("base64")}`)

      console.log(`Generated ${panels.length} panels with preserved color`)

      return NextResponse.json({
        success: true,
        panel_crops: panels,
      })
    } catch (processingError) {
      console.error("Error processing image:", processingError)

      // If processing fails, return the original image as a single panel
      const base64Image = Buffer.from(buffer).toString("base64")
      const dataUrl = `data:image/${file.type.split("/")[1] || "png"};base64,${base64Image}`

      return NextResponse.json({
        success: true,
        panel_crops: [dataUrl],
        error: "Failed to process panels, using original image",
      })
    }
  } catch (error) {
    console.error("Error in preserve-color-panels route:", error)
    return NextResponse.json(
      {
        success: false,
        error: "Failed to process image",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      { status: 500 },
    )
  }
}
