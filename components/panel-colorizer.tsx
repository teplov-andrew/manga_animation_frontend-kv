"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Palette, Loader2, ArrowRight, RefreshCw } from "lucide-react"
import Image from "next/image"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"

interface PanelColorizerProps {
  panel: string
  onColorized: (colorizedPanel: string) => void
  onBack: () => void
  onSkip: () => void
}

export function PanelColorizer({ panel, onColorized, onBack, onSkip }: PanelColorizerProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [colorizedPanel, setColorizedPanel] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [retryCount, setRetryCount] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  const { toast } = useToast() // Use the hook to get the toast function
  const [isExternalUrl, setIsExternalUrl] = useState(false)

  // Check if the panel is an external URL
  useEffect(() => {
    setIsExternalUrl(panel.startsWith("http"))
  }, [panel])

  // Update the handlePanelColorized function to ensure we're properly formatting the base64 data
  const handlePanelColorized = (colorizedPanel: string) => {
    // Save the colorized panel and move to animation step
    setColorizedPanel(colorizedPanel)

    console.log("Colorized panel saved:", colorizedPanel.substring(0, 50) + "...")
  }

  // Update the colorizePanel function to ensure we're properly handling the base64 data
  const colorizePanel = async (useRetry = false) => {
    setIsProcessing(true)
    setError(null)

    // Add a timeout warning
    let timeoutWarningTimer: NodeJS.Timeout | null = null

    timeoutWarningTimer = setTimeout(() => {
      toast({
        title: "Processing Taking Longer",
        description: "Colorization can take up to 5 minutes for detailed panels. Please be patient.",
      })
    }, 30000) // Show warning after 30 seconds

    try {
      // If we're already using fallback or have retried too many times, go straight to fallback
      if (useFallback || retryCount >= 3) {
        throw new Error("Using fallback colorization")
      }

      let blob: Blob

      if (isExternalUrl) {
        // If the panel is an external URL, fetch it first
        const imageResponse = await fetch(panel)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`)
        }
        blob = await imageResponse.blob()
      } else {
        // Otherwise, it's a base64 image
        const response = await fetch(panel)
        blob = await response.blob()
      }

      // Create a FormData object and append the image
      const formData = new FormData()
      formData.append("file", blob, "panel.jpg")

      // Add a timestamp to prevent caching issues
      formData.append("timestamp", Date.now().toString())

      console.log("Sending colorization request to API")

      // Send the image to the colorization API with a longer timeout
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), 300000) // 5 minute timeout

      try {
        const apiResponse = await fetch("/api/proxy-colorize-api", {
          method: "POST",
          body: formData,
          signal: controller.signal,
          // Add cache control headers to prevent caching issues
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
            Pragma: "no-cache",
            Expires: "0",
          },
        })

        // Clear the timeout
        clearTimeout(timeoutId)

        // Clear the warning timer if it exists
        if (timeoutWarningTimer) {
          clearTimeout(timeoutWarningTimer)
        }

        if (!apiResponse.ok) {
          console.error(`API error: ${apiResponse.status}`)
          throw new Error(`API error: ${apiResponse.status}`)
        }

        const data = await apiResponse.json()

        if (data.colorized_image) {
          // Make sure the base64 string has the proper prefix if it doesn't already
          const imageData = data.colorized_image.startsWith("data:image/")
            ? data.colorized_image
            : `data:image/png;base64,${data.colorized_image}`

          console.log("Received colorized image data:", imageData.substring(0, 50) + "...")

          // Store the raw base64 data in a global window variable for debugging
          // @ts-ignore
          window.lastColorizedImage = data.colorized_image

          setColorizedPanel(imageData)

          // Reset retry count and fallback flag on success
          setRetryCount(0)
          setUseFallback(false)

          // Remove toast notification
          // toast({
          //   title: "Colorization Complete",
          //   description: "Panel has been successfully colorized",
          // })
        } else {
          throw new Error("No colorized image returned from API")
        }
      } catch (fetchError) {
        // Clear the timeout
        clearTimeout(timeoutId)

        // Re-throw the error to be handled by the outer try/catch
        throw fetchError
      }
    } catch (err) {
      console.error("Error colorizing panel:", err)

      // Clear the warning timer if it exists
      if (timeoutWarningTimer) {
        clearTimeout(timeoutWarningTimer)
      }

      if (useRetry && retryCount < 3) {
        // Increment retry count
        setRetryCount((prev) => prev + 1)
        setError(`API error occurred. Retrying... (${retryCount + 1}/3)`)

        // Wait a moment before retrying
        setTimeout(() => {
          colorizePanel(true)
        }, 5000) // Wait 5 seconds before retrying
        return
      }

      // Provide more specific error message for timeouts
      if (err instanceof Error) {
        if (err.message.includes("timeout") || err.message.includes("aborted") || err.message.includes("network")) {
          setError(
            `Connection issue with the colorization API. This could be due to server load or network problems. Colorization can take up to 5 minutes for detailed panels. Please try again.`,
          )
        } else {
          setError(`Failed to colorize the panel: ${err.message}`)
        }
      } else {
        setError(`Failed to colorize the panel. Please try again later.`)
      }

      setUseFallback(true)

      // For demo purposes, if the API fails, we'll simulate a colorized image
      console.log("Using fallback colorization (original image)")
      setColorizedPanel(panel)
    } finally {
      setIsProcessing(false)
    }
  }

  const confirmColorization = () => {
    if (colorizedPanel) {
      console.log("Confirming colorization, passing to animator:", colorizedPanel.substring(0, 50) + "...")
      onColorized(colorizedPanel)
    }
  }

  // Retry colorization
  const retryColorization = () => {
    setRetryCount(0)
    setUseFallback(false)
    colorizePanel(true)
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Colorize Panel</CardTitle>
        <CardDescription>Add color to your black and white manga panel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {error && (
          <Alert variant={useFallback ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{useFallback ? "Using Fallback Mode" : "Error"}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              {useFallback && (
                <p className="text-sm">Continuing with the original panel. You can skip colorization or try again.</p>
              )}
              {!isProcessing && (
                <Button variant="outline" size="sm" className="self-start mt-2" onClick={retryColorization}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry Colorization
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        <div className="flex flex-col md:flex-row gap-4 items-center justify-center">
          {/* Original Panel */}
          <div className="flex-1 border rounded-md overflow-hidden bg-black/10 max-w-[220px]">
            <div className="relative aspect-square">
              <Image
                src={panel || "/placeholder.svg"}
                alt="Original manga panel"
                fill
                className="object-contain"
                unoptimized={isExternalUrl} // Disable optimization for external URLs
              />
            </div>
            <div className="p-1 text-center text-xs font-medium bg-muted">Original</div>
          </div>

          {/* Arrow */}
          <div className="flex-none">
            <ArrowRight className="h-6 w-6 text-muted-foreground" />
          </div>

          {/* Colorized Panel */}
          <div className="flex-1 border rounded-md overflow-hidden bg-black/10 max-w-[220px]">
            <div className="relative aspect-square">
              {isProcessing ? (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-6 w-6 text-primary animate-spin" />
                    <p className="text-xs text-center">Colorizing panel...</p>
                    <p className="text-xs text-center text-muted-foreground px-2">
                      This may take up to 5 minutes for detailed panels
                    </p>
                  </div>
                </div>
              ) : colorizedPanel ? (
                <Image
                  src={colorizedPanel || "/placeholder.svg"}
                  alt="Colorized manga panel"
                  fill
                  className="object-contain"
                  unoptimized={colorizedPanel.startsWith("http")} // Disable optimization for external URLs
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center bg-black/10">
                  <p className="text-muted-foreground text-center text-xs px-2">
                    Click "Colorize" to add color to your panel
                  </p>
                </div>
              )}
            </div>
            <div className="p-1 text-center text-xs font-medium bg-muted">Colorized</div>
          </div>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between">
        <div className="flex gap-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft size={16} className="mr-2" />
            Cancel
          </Button>
          <Button variant="outline" onClick={onSkip}>
            Skip
          </Button>
        </div>

        {!colorizedPanel ? (
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={() => colorizePanel(true)}
            disabled={isProcessing}
          >
            {isProcessing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Colorizing...
              </>
            ) : (
              <>
                <Palette className="mr-2 h-4 w-4" />
                Colorize
              </>
            )}
          </Button>
        ) : (
          <Button className="bg-primary hover:bg-primary/90" onClick={confirmColorization}>
            <ArrowRight size={16} className="mr-2" />
            Done
          </Button>
        )}
      </CardFooter>
    </Card>
  )
}
