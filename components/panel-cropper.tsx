"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Crop, Check, X, Loader2, ArrowRight, AlertCircle, RefreshCw, ExternalLink } from "lucide-react"
import Image from "next/image"
import { cn } from "@/lib/utils"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"

interface PanelCropperProps {
  projectImage: string | null
  onPanelsDetected: (panels: string[]) => void
  onPanelSelected: (panel: string) => void
  onCancel: () => void
}

interface Panel {
  id: string
  imageData: string
  selected: boolean
}

// Create a cache to store panel detection results
const panelCache = new Map<string, Panel[]>()

export function PanelCropper({ projectImage, onPanelsDetected, onPanelSelected, onCancel }: PanelCropperProps) {
  // Add a debug mode to help diagnose issues

  // Add this state near the top of the component with the other state variables:
  const [isProcessing, setIsProcessing] = useState(false)
  const [panels, setPanels] = useState<Panel[]>([])
  const [error, setError] = useState<string | null>(null)
  const [selectedPanelId, setSelectedPanelId] = useState<string | null>(null)
  const [panelsDetected, setPanelsDetected] = useState(false)
  const [retryCount, setRetryCount] = useState(0)
  const [useFallback, setUseFallback] = useState(false)
  const projectImageRef = useRef<string | null>(null)

  // Reset state when projectImage changes
  useEffect(() => {
    if (projectImage && projectImage !== projectImageRef.current) {
      // Only reset if we have a new image
      projectImageRef.current = projectImage
      setPanels([])
      setSelectedPanelId(null)
      setPanelsDetected(false)
      setError(null)
      setUseFallback(false)
      setRetryCount(0)
    }
  }, [projectImage])

  // Check if we have cached panels for this image
  useEffect(() => {
    if (projectImage && !panelsDetected && panels.length === 0 && !isProcessing) {
      // Check if we have cached panels for this image
      if (panelCache.has(projectImage)) {
        console.log("Using cached panels for this image")
        const cachedPanels = panelCache.get(projectImage) || []
        setPanels(cachedPanels)
        setPanelsDetected(true)

        // Save all detected panels to the project
        const allPanelImages = cachedPanels.map((panel) => panel.imageData)
        onPanelsDetected(allPanelImages)
      } else {
        // No cached panels, process the image
        processImage()
      }
    }
  }, [projectImage, panelsDetected, panels.length, isProcessing, onPanelsDetected])

  // Update the processImage function to handle panel_crops format
  const processImage = async (useRetry = false) => {
    if (!projectImage) return

    setIsProcessing(true)
    setError(null)

    try {
      // If we're already using fallback or have retried too many times, go straight to fallback
      if (useFallback || retryCount >= 2) {
        console.log("Using fallback panel detection due to previous failures")
        throw new Error("Using fallback panel detection")
      }

      // Convert base64 image to a Blob
      const response = await fetch(projectImage)
      const blob = await response.blob()

      // Create a FormData object and append the image
      const formData = new FormData()
      formData.append("file", blob, "manga_page.jpg")

      console.log("Sending panel detection request to API")

      // Use our server-side proxy to avoid CORS issues
      const apiResponse = await fetch("/api/proxy-panel-api", {
        method: "POST",
        body: formData,
        // Add cache control headers to prevent caching issues
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!apiResponse.ok) {
        console.error(`API responded with status: ${apiResponse.status}`)
        throw new Error(`API error: ${apiResponse.status}`)
      }

      const data = await apiResponse.json()
      console.log("Received panel detection response")

      // Check for the panel_crops array in the response (primary format)
      if (data.panel_crops && Array.isArray(data.panel_crops)) {
        console.log(`Found ${data.panel_crops.length} panel crops in response`)

        const panelData = data.panel_crops.map((base64Image: string, index: number) => {
          // Make sure the base64 string has the proper prefix if it doesn't already
          const imageData = base64Image.startsWith("data:image/") ? base64Image : `data:image/png;base64,${base64Image}`

          return {
            id: `panel-${index + 1}`,
            imageData: imageData,
            selected: false,
          }
        })

        // Cache the panels for this image
        if (projectImage) {
          panelCache.set(projectImage, panelData)
        }

        setPanels(panelData)
        setPanelsDetected(true)

        // Save all detected panels to the project
        const allPanelImages = panelData.map((panel) => panel.imageData)
        onPanelsDetected(allPanelImages)

        // Reset retry count and fallback flag on success
        setRetryCount(0)
        setUseFallback(false)
      }
      // Check for the panel_urls array as fallback
      else if (data.panel_urls && data.panel_urls.length > 0) {
        console.log(`Found ${data.panel_urls.length} panel URLs in response`)

        // Process the image URLs returned from the API
        const panelData = data.panel_urls.map((imageUrl: string, index: number) => {
          return {
            id: `panel-${index + 1}`,
            imageData: imageUrl, // This is now a URL instead of base64 data
            selected: false,
          }
        })

        // Cache the panels for this image
        if (projectImage) {
          panelCache.set(projectImage, panelData)
        }

        setPanels(panelData)
        setPanelsDetected(true)

        // Save all detected panels to the project
        const allPanelImages = panelData.map((panel) => panel.imageData)
        onPanelsDetected(allPanelImages)

        // Reset retry count and fallback flag on success
        setRetryCount(0)
        setUseFallback(false)
      } else {
        console.log("No panels found in API response, using fallback:", data)
        // Instead of throwing an error, use fallback panels directly
        setUseFallback(true)
        const mockPanels = generateMockPanels(projectImage)
        setPanels(mockPanels)
        setPanelsDetected(true)

        // Save mock panels to the project
        const allPanelImages = mockPanels.map((panel) => panel.imageData)
        onPanelsDetected(allPanelImages)

        // Cache the mock panels for this image
        panelCache.set(projectImage, mockPanels)

        // Set a more user-friendly error message
        setError("No panels were detected in the image. Using the full image as a panel instead.")
      }
    } catch (err) {
      console.error("Error processing image:", err)

      if (useRetry && retryCount < 2) {
        // Increment retry count
        setRetryCount((prev) => prev + 1)
        setError(`API error occurred. Retrying... (${retryCount + 1}/2)`)

        // Wait a moment before retrying
        setTimeout(() => {
          processImage(true)
        }, 1500)
        return
      }

      // Set error message for display
      setError(`Failed to process the image. ${err instanceof Error ? err.message : "Please try again later."}`)
      setUseFallback(true)

      // If the API call fails, fall back to mock panels for demonstration
      if (projectImage) {
        const mockPanels = generateMockPanels(projectImage)
        setPanels(mockPanels)
        setPanelsDetected(true)

        // Save mock panels to the project
        const allPanelImages = mockPanels.map((panel) => panel.imageData)
        onPanelsDetected(allPanelImages)

        // Cache the mock panels for this image
        panelCache.set(projectImage, mockPanels)
      }
    } finally {
      setIsProcessing(false)
    }
  }

  // Generate mock panels from the original image for fallback
  const generateMockPanels = (imageUrl: string): Panel[] => {
    console.log("Generating mock panels as fallback")
    // Create a set of mock panels
    const mockPanels: Panel[] = []

    // Add the full image as the first panel
    mockPanels.push({
      id: "panel-1",
      imageData: imageUrl,
      selected: false,
    })

    // For a more realistic fallback, we'll create panels that are sections of the original image
    // In a real implementation, we would use canvas to crop the image
    // For now, we'll just use the full image for all panels

    // Add 3-5 more panels (all using the full image)
    for (let i = 2; i <= 5; i++) {
      mockPanels.push({
        id: `panel-${i}`,
        imageData: imageUrl,
        selected: false,
      })
    }

    console.log(`Generated ${mockPanels.length} mock panels as fallback`)
    return mockPanels
  }

  // Select a single panel for animation
  const selectPanel = (panelId: string) => {
    // Update the selected state for UI
    setPanels(
      panels.map((panel) => ({
        ...panel,
        selected: panel.id === panelId,
      })),
    )

    // Save the selected panel ID
    setSelectedPanelId(panelId)
  }

  // Confirm the selected panel and proceed to colorize step
  const confirmSelection = () => {
    if (selectedPanelId) {
      const selectedPanel = panels.find((panel) => panel.id === selectedPanelId)
      if (selectedPanel) {
        // Always call onPanelSelected to ensure we go to the colorize step
        onPanelSelected(selectedPanel.imageData)
      }
    }
  }

  // Retry panel detection
  const retryPanelDetection = () => {
    setRetryCount(0)
    setUseFallback(false)
    processImage(true)
  }

  // Function to open image in new tab for debugging
  const openImageInNewTab = (url: string) => {
    window.open(url, "_blank")
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Select Panel for Animation</CardTitle>
        <CardDescription>Choose one panel to animate from your manga page</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {error && (
          <Alert variant={useFallback ? "default" : "destructive"}>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>{useFallback ? "Using Fallback Mode" : "Error"}</AlertTitle>
            <AlertDescription className="flex flex-col gap-2">
              <p>{error}</p>
              {useFallback && (
                <p className="text-sm">
                  Continuing with basic panel detection. You can still select panels to animate.
                </p>
              )}
              {!isProcessing && (
                <Button variant="outline" size="sm" className="self-start mt-2" onClick={retryPanelDetection}>
                  <RefreshCw className="h-4 w-4 mr-2" /> Retry Panel Detection
                </Button>
              )}
            </AlertDescription>
          </Alert>
        )}

        {projectImage ? (
          <>
            <div className="relative border rounded-md overflow-hidden max-w-md mx-auto">
              <div className="aspect-[2/3] relative">
                <Image src={projectImage || "/placeholder.svg"} alt="Manga page" fill className="object-contain" />
              </div>
            </div>

            {panels.length > 0 ? (
              <div>
                <h3 className="text-lg font-medium mb-2">
                  {useFallback ? "Available Panels (Fallback Mode)" : "Detected Panels"}
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  {panels.length} panels {useFallback ? "available" : "detected"}. Select one panel to animate.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                  {panels.map((panel) => (
                    <div
                      key={panel.id}
                      className={cn(
                        "border-2 rounded-md overflow-hidden cursor-pointer transition-all",
                        panel.selected ? "border-green-500" : "border-transparent hover:border-muted-foreground",
                      )}
                      onClick={() => selectPanel(panel.id)}
                    >
                      <div className="relative aspect-square bg-gray-100 flex items-center justify-center">
                        {/* Loading indicator */}
                        <div className="absolute inset-0 flex items-center justify-center z-10">
                          <Loader2 className="h-6 w-6 text-muted-foreground animate-spin" />
                        </div>

                        {panel.imageData.startsWith("http") ? (
                          // For external URLs, use the proxy to avoid CORS issues
                          <img
                            src={`/api/proxy-image?url=${encodeURIComponent(panel.imageData)}`}
                            alt={`Panel ${panel.id}`}
                            className="w-full h-full object-contain relative z-20"
                            onLoad={(e) => {
                              // Hide the loader when image loads
                              const target = e.target as HTMLImageElement
                              target.style.zIndex = "20"
                              // Hide the loader (previous sibling)
                              const loader = target.previousElementSibling as HTMLElement
                              if (loader) loader.style.display = "none"
                            }}
                            onError={(e) => {
                              console.error(`Failed to load image via proxy: ${panel.imageData}`)
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?text=Load+Error"
                              // Hide the loader
                              const loader = target.previousElementSibling as HTMLElement
                              if (loader) loader.style.display = "none"
                            }}
                          />
                        ) : (
                          // For base64 or other data URLs
                          <img
                            src={panel.imageData || "/placeholder.svg"}
                            alt={`Panel ${panel.id}`}
                            className="w-full h-full object-contain relative z-20"
                            onLoad={(e) => {
                              // Hide the loader when image loads
                              const target = e.target as HTMLImageElement
                              target.style.zIndex = "20"
                              // Hide the loader (previous sibling)
                              const loader = target.previousElementSibling as HTMLElement
                              if (loader) loader.style.display = "none"
                            }}
                            onError={(e) => {
                              console.error(`Failed to load image: ${panel.imageData}`)
                              const target = e.target as HTMLImageElement
                              target.src = "/placeholder.svg?text=Load+Error"
                              // Hide the loader
                              const loader = target.previousElementSibling as HTMLElement
                              if (loader) loader.style.display = "none"
                            }}
                          />
                        )}

                        {panel.selected && (
                          <div className="absolute top-2 right-2 bg-green-500 rounded-full p-1 z-30">
                            <Check size={14} className="text-white" />
                          </div>
                        )}

                        {panel.imageData.startsWith("http") && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="absolute bottom-1 right-1 h-6 w-6 bg-white/80 hover:bg-white z-30"
                            onClick={(e) => {
                              e.stopPropagation()
                              openImageInNewTab(`/api/proxy-image?url=${encodeURIComponent(panel.imageData)}`)
                            }}
                          >
                            <ExternalLink size={12} />
                          </Button>
                        )}
                      </div>
                      <div className="p-1 text-center text-xs font-medium">Panel {panel.id.split("-")[1]}</div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-8">
                {isProcessing ? (
                  <div className="flex flex-col items-center space-y-4">
                    <Loader2 className="h-8 w-8 text-primary animate-spin" />
                    <p>Detecting panels in your manga page...</p>
                  </div>
                ) : (
                  <Button onClick={() => processImage(true)} className="space-x-2">
                    <Crop size={16} />
                    <span>Detect Panels</span>
                  </Button>
                )}
              </div>
            )}
          </>
        ) : (
          <div className="flex flex-col items-center justify-center py-12">
            <p className="text-muted-foreground">No image available. Please upload a manga page first.</p>
          </div>
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onCancel}>
          <X size={16} className="mr-2" />
          Cancel
        </Button>
        <Button onClick={confirmSelection} disabled={!selectedPanelId || isProcessing}>
          <ArrowRight size={16} className="mr-2" />
          Continue to Colorize
        </Button>
      </CardFooter>
    </Card>
  )
}
