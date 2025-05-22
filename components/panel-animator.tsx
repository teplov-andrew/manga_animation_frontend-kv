"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, Save, Wand2, Sliders, Loader2, RefreshCw, AlertCircle, Download } from "lucide-react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"
import type { Animation } from "@/types/project"
import { Alert, AlertDescription, AlertTitle } from "./ui/alert"

interface PanelAnimatorProps {
  panel: string
  onBack: () => void
  onSaveAnimation: (animation: Animation) => void
}

export function PanelAnimator({ panel, onBack, onSaveAnimation }: PanelAnimatorProps) {
  // At the beginning of the component, update the debug logging to better show what panel data is being received
  console.log("Panel data received in animator:", panel.substring(0, 100) + "...")
  console.log("Is panel data a base64 string?", panel.startsWith("data:image"))
  console.log("Is panel data an external URL?", panel.startsWith("http"))

  const [animationMode, setAnimationMode] = useState<"ai" | "manual">("manual")
  const [isPlaying, setIsPlaying] = useState(false)
  const [effect, setEffect] = useState("zoom")
  const [intensity, setIntensity] = useState(20)
  const [direction, setDirection] = useState("right")
  const [loopAnimation, setLoopAnimation] = useState(true)
  const [aiPrompt, setAiPrompt] = useState("Animate this manga panel with subtle movement")
  const [isGenerating, setIsGenerating] = useState(false)
  const [aiGenerated, setAiGenerated] = useState(false)
  const { toast } = useToast()
  const [isExternalUrl, setIsExternalUrl] = useState(false)

  // Add a new state for the selected AI model and video result at the top of the component
  const [selectedModel, setSelectedModel] = useState<"vidu" | "wan" | "cogvideox">("vidu")
  const [videoResult, setVideoResult] = useState<string | null>(null)
  const [videoLoading, setVideoLoading] = useState(false)
  const [videoError, setVideoError] = useState<string | null>(null)

  // Add a new state for manual animation video result
  const [manualVideoResult, setManualVideoResult] = useState<string | null>(null)
  const [manualVideoLoading, setManualVideoLoading] = useState<string | null>(null)
  const [manualVideoError, setManualVideoError] = useState<string | null>(null)

  // Add state for progress tracking
  const [progressLogs, setProgressLogs] = useState<string[]>([])
  const [progressPercentage, setProgressPercentage] = useState(0)

  // Add state to track if we're in offline mode
  const [isOfflineMode, setIsOfflineMode] = useState(false) // Keep for compatibility but never use it

  // Check if the panel is an external URL
  useEffect(() => {
    setIsExternalUrl(panel.startsWith("http"))
  }, [panel])

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const resetAnimation = () => {
    setIsPlaying(false)
  }

  // Function to convert base64 to blob
  const base64ToBlob = async (base64Data: string, contentType = "image/png") => {
    // If it's already a data URL, extract the base64 part
    if (base64Data.startsWith("data:")) {
      const parts = base64Data.split(",")
      if (parts.length === 2) {
        base64Data = parts[1]
        // Extract content type if available
        const mimeMatch = parts[0].match(/:(.*?);/)
        if (mimeMatch && mimeMatch.length > 1) {
          contentType = mimeMatch[1]
        }
      }
    }

    // Convert base64 to binary
    const byteCharacters = atob(base64Data)
    const byteArrays = []

    for (let offset = 0; offset < byteCharacters.length; offset += 512) {
      const slice = byteCharacters.slice(offset, offset + 512)

      const byteNumbers = new Array(slice.length)
      for (let i = 0; i < slice.length; i++) {
        byteNumbers[i] = slice.charCodeAt(i)
      }

      const byteArray = new Uint8Array(byteNumbers)
      byteArrays.push(byteArray)
    }

    return new Blob(byteArrays, { type: contentType })
  }

  // Update the generateManualAnimation function to ensure we're preserving color information
  const generateManualAnimation = async () => {
    // Don't start a new request if one is already in progress
    if (manualVideoLoading) {
      toast({
        title: "Animation in Progress",
        description: "Please wait for the current animation to complete before generating a new one.",
      })
      return
    }

    // Add debug logging to see what panel data we're working with
    console.log("Panel data for animation:", panel.substring(0, 100) + "...")
    console.log("Is panel data a base64 string?", panel.startsWith("data:image"))
    console.log("Is panel data an external URL?", panel.startsWith("http"))

    setManualVideoLoading(true)
    setManualVideoResult(null)
    setManualVideoError(null)

    try {
      let blob: Blob

      // DIRECT APPROACH: Convert the panel data to a blob
      if (panel.startsWith("data:image")) {
        try {
          // Use our helper function to convert base64 to blob
          blob = await base64ToBlob(panel)
          console.log("Successfully converted data URL to blob:", blob.type, blob.size)
        } catch (error) {
          console.error("Error converting data URL to blob:", error)
          throw new Error("Failed to process the colorized image")
        }
      } else if (isExternalUrl) {
        // If the panel is an external URL, fetch it first
        const imageResponse = await fetch(panel)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`)
        }
        blob = await imageResponse.blob()
      } else {
        // Otherwise, it's a regular image path
        const response = await fetch(panel)
        blob = await response.blob()
      }

      // Create FormData
      const formData = new FormData()

      // Explicitly set the filename with .png extension to ensure color preservation
      formData.append("file", blob, "colorized_panel.png")
      formData.append("effect", effect)
      formData.append("timestamp", Date.now().toString())

      console.log("Sending animation request with blob:", {
        size: blob.size,
        type: blob.type,
        effect: effect,
      })

      // Call our proxy API
      const apiResponse = await fetch("/api/proxy-manual-animation", {
        method: "POST",
        body: formData,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
          Pragma: "no-cache",
          Expires: "0",
        },
      })

      if (!apiResponse.ok) {
        throw new Error(`API error: ${apiResponse.status}`)
      }

      const data = await apiResponse.json()

      if (data.error) {
        throw new Error(data.error)
      }

      if (data.file_url) {
        setManualVideoResult(data.file_url)
        // Remove toast notification
        // toast({
        //   title: "Animation Generated",
        //   description: `Successfully created ${effect} animation`,
        // })
      } else {
        throw new Error("No video URL in response")
      }
    } catch (err) {
      console.error("Error generating manual animation:", err)
      setManualVideoError(`Failed to generate animation: ${err instanceof Error ? err.message : "Unknown error"}`)

      toast({
        title: "Animation Failed",
        description: "Could not generate animation. Using CSS fallback.",
        variant: "destructive",
      })

      // Fallback to CSS animation when API fails
      const cssAnimationUrl = `data:video/mp4;base64,${effect}-offline-animation`
      setManualVideoResult(cssAnimationUrl)
    } finally {
      setManualVideoLoading(false)
    }
  }

  // Update the generateAiAnimation function to handle streaming responses
  const generateAiAnimation = async () => {
    // Don't start a new request if one is already in progress
    if (isGenerating) {
      toast({
        title: "Animation in Progress",
        description: "Please wait for the current animation to complete before generating a new one.",
      })
      return
    }

    setIsGenerating(true)
    setVideoResult(null)
    setVideoError(null)
    setAiGenerated(false)
    setProgressLogs([])
    setProgressPercentage(0)

    // Add a timeout warning for VIDU model
    let timeoutWarningShown = false
    let timeoutWarningTimer: NodeJS.Timeout | null = null

    if (selectedModel === "vidu") {
      timeoutWarningTimer = setTimeout(() => {
        // Remove toast notification
        // toast({
        //   title: "Processing In Progress",
        //   description:
        //     "VIDU Q1 model is working on your animation. This can take up to 10 minutes for high-quality results. Please be patient.",
        // })
        timeoutWarningShown = true
      }, 30000) // Show warning after 30 seconds
    }

    try {
      let blob: Blob

      if (panel.startsWith("data:image")) {
        try {
          // Use our helper function to convert base64 to blob
          blob = await base64ToBlob(panel)
          console.log("Successfully converted data URL to blob for AI animation:", blob.type, blob.size)
        } catch (error) {
          console.error("Error converting data URL to blob for AI animation:", error)
          throw new Error("Failed to process the colorized image")
        }
      } else if (isExternalUrl) {
        // If the panel is an external URL, fetch it first
        const imageResponse = await fetch(panel)
        if (!imageResponse.ok) {
          throw new Error(`Failed to fetch image from URL: ${imageResponse.status}`)
        }
        blob = await imageResponse.blob()
      } else {
        // Otherwise, it's a regular image path
        const response = await fetch(panel)
        blob = await response.blob()
      }

      // Create FormData
      const formData = new FormData()

      // Ensure we're sending the file with the correct name and type
      formData.append("file", blob, "panel.png") // Use .png extension to ensure proper handling
      formData.append("prompt", aiPrompt)
      formData.append("model", selectedModel)
      formData.append("timestamp", Date.now().toString())

      console.log(`Sending animation request to API for model: ${selectedModel}`)
      console.log(`Prompt: ${aiPrompt}`)

      // Initial API call to start the animation task
      const apiResponse = await fetch("/api/proxy-animation-api", {
        method: "POST",
        body: formData,
      })

      if (!apiResponse.ok) {
        const errorText = await apiResponse.text().catch(() => "Could not read error response")
        console.error(`API responded with status: ${apiResponse.status}, body: ${errorText}`)
        throw new Error(`API error: ${apiResponse.status} - ${errorText}`)
      }

      const data = await apiResponse.json()
      console.log("API response data:", data)

      // Check if we got a fallback response
      if (data.fallback || data.error) {
        console.log("Using fallback animation due to API error:", data.error || "Unknown error")

        // Use CSS-based animation as fallback
        setProgressLogs((prev) => [...prev, "API unavailable. Using fallback animation."])
        setProgressPercentage(100)

        // Create a dummy video URL for the animation feed based on the prompt
        const promptWords = aiPrompt.toLowerCase().split(" ")
        let animationType = "zoom"

        // Simple keyword detection for animation type
        if (promptWords.some((word) => ["zoom", "close", "closer", "magnify"].includes(word))) {
          animationType = "zoom"
        } else if (promptWords.some((word) => ["pan", "move", "slide", "shift"].includes(word))) {
          animationType = "pan"
        } else if (promptWords.some((word) => ["shake", "vibrate", "tremble", "quake"].includes(word))) {
          animationType = "shake"
        } else if (promptWords.some((word) => ["fade", "dissolve", "appear", "disappear"].includes(word))) {
          animationType = "fade"
        }

        // Set a dummy video URL that will trigger CSS animation in the feed
        setVideoResult(`data:video/mp4;base64,${animationType}-offline-animation`)
        setAiGenerated(true)

        // Remove toast notification
        // toast({
        //   title: "Using Fallback Animation",
        //   description: "The animation API is currently unavailable. Using a fallback animation instead.",
        // })

        // Clear the timeout warning timer if it exists
        if (timeoutWarningTimer) {
          clearTimeout(timeoutWarningTimer)
        }

        setIsGenerating(false)
        return
      }

      if (data.error) {
        console.error("API returned error:", data.error)
        throw new Error(data.error)
      }

      // For VIDU model with task-based workflow
      if (selectedModel === "vidu" && data.task) {
        const { id: taskId, statusUrl } = data.task
        console.log(`Task created with ID: ${taskId}`)
        console.log(`Status URL: ${statusUrl}`)

        // Add a log entry
        setProgressLogs((prev) => [...prev, `Task created with ID: ${taskId.substring(0, 8)}...`])
        setProgressPercentage(5)

        // Start polling for task status
        let isCompleted = false
        let attempts = 0
        const maxAttempts = 120 // 10 minutes with 5-second intervals

        while (!isCompleted && attempts < maxAttempts) {
          attempts++

          try {
            // Wait 5 seconds between status checks
            await new Promise((resolve) => setTimeout(resolve, 5000))

            // Check task status
            const statusResponse = await fetch(`/api/check-vidu-status?url=${encodeURIComponent(statusUrl)}`)

            if (!statusResponse.ok) {
              console.error(`Status check failed: ${statusResponse.status}`)
              setProgressLogs((prev) => [...prev, `Status check failed: attempt ${attempts}`])
              continue
            }

            const statusData = await statusResponse.json()
            console.log(`Status check ${attempts}:`, statusData)

            // Update progress based on status
            if (statusData.status === "pending") {
              setProgressLogs((prev) => [...prev, `Task is pending in queue (check ${attempts})`])
              setProgressPercentage(10)
            } else if (statusData.status === "running") {
              setProgressLogs((prev) => [...prev, `Task is running (check ${attempts})`])
              // Gradually increase progress percentage based on number of attempts
              const runningProgress = Math.min(15 + attempts * 2, 90)
              setProgressPercentage(runningProgress)
            } else if (statusData.status === "done" && statusData.result) {
              isCompleted = true
              setProgressLogs((prev) => [...prev, "Task completed successfully!"])
              setProgressPercentage(100)

              // Extract video URL from the result
              const videoUrl = statusData.result.video?.url

              if (videoUrl) {
                console.log("Found video URL in result:", videoUrl)
                setVideoResult(videoUrl)
                setAiGenerated(true)

                // Remove toast notification
                // toast({
                //   title: "Animation Generated",
                //   description: `Successfully created animation using VIDU Q1 model`,
                // })
              } else {
                throw new Error("No video URL found in completed task result")
              }
            } else if (statusData.status === "error" || statusData.error) {
              throw new Error(`Task failed: ${statusData.error || "Unknown error"}`)
            }
          } catch (statusError) {
            console.error("Error checking task status:", statusError)
            setProgressLogs((prev) => [
              ...prev,
              `Error checking status: ${statusError instanceof Error ? statusError.message : "Unknown error"}`,
            ])
            // Continue polling despite errors
          }
        }

        // If we've reached max attempts without completion
        if (!isCompleted) {
          throw new Error(`Task timed out after ${maxAttempts} status checks`)
        }
      }
      // For WAN model or direct response
      else if (data.video?.url) {
        console.log("Found video URL:", data.video.url)
        setVideoResult(data.video.url)
        setAiGenerated(true)
        setProgressPercentage(100)

        toast({
          title: "Animation Generated",
          description: `Successfully created animation using ${selectedModel === "vidu" ? "VIDU Q1" : "Wan 2.1"} model`,
        })
      } else {
        throw new Error("Invalid API response format")
      }
    } catch (err) {
      console.error("Error generating animation:", err)

      // Clear the timeout warning timer if it exists
      if (timeoutWarningTimer) {
        clearTimeout(timeoutWarningTimer)
      }

      // Provide more specific error message
      if (err instanceof Error) {
        setVideoError(`Failed to generate animation: ${err.message}. Please try again later.`)
      } else {
        setVideoError("An unknown error occurred. Please try again.")
      }

      // Use CSS-based animation as fallback
      setProgressLogs((prev) => [...prev, "API error. Using fallback animation."])
      setProgressPercentage(100)

      // Create a dummy video URL for the animation feed based on the prompt
      const promptWords = aiPrompt.toLowerCase().split(" ")
      let animationType = "zoom"

      // Simple keyword detection for animation type
      if (promptWords.some((word) => ["zoom", "close", "closer", "magnify"].includes(word))) {
        animationType = "zoom"
      } else if (promptWords.some((word) => ["pan", "move", "slide", "shift"].includes(word))) {
        animationType = "pan"
      } else if (promptWords.some((word) => ["shake", "vibrate", "tremble", "quake"].includes(word))) {
        animationType = "shake"
      } else if (promptWords.some((word) => ["fade", "dissolve", "appear", "disappear"].includes(word))) {
        animationType = "fade"
      }

      // Set a dummy video URL that will trigger CSS animation in the feed
      setVideoResult(`data:video/mp4;base64,${animationType}-offline-animation`)
      setAiGenerated(true)

      toast({
        title: "Using Fallback Animation",
        description: "The animation API is currently unavailable. Using a fallback animation instead.",
        variant: "destructive",
      })
    } finally {
      // Clear the timeout warning timer if it exists
      if (timeoutWarningTimer) {
        clearTimeout(timeoutWarningTimer)
      }

      setIsGenerating(false)
    }
  }

  // Add a fallback demo animation option
  const useDemoAnimation = () => {
    setVideoResult("https://storage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4")
    setAiGenerated(true)
    setProgressPercentage(100)
    // Remove toast notification
    // toast({
    //   title: "Using Demo Animation",
    //   description: "Showing a demo animation since the service is unavailable.",
    // })
  }

  // Add a new function for creating CSS-based animations without requiring the external API
  const generateOfflineAnimation = () => {
    // Set a loading state briefly to show something is happening
    setIsGenerating(true)

    // Create a simulated delay to mimic processing
    setTimeout(() => {
      // For AI mode, use a pre-defined animation based on the model and prompt
      if (animationMode === "ai") {
        // Generate a deterministic animation style based on the prompt
        const promptWords = aiPrompt.toLowerCase().split(" ")
        let animationType = "zoom"

        // Simple keyword detection for animation type
        if (promptWords.some((word) => ["zoom", "close", "closer", "magnify"].includes(word))) {
          animationType = "zoom"
        } else if (promptWords.some((word) => ["pan", "move", "slide", "shift"].includes(word))) {
          animationType = "pan"
        } else if (promptWords.some((word) => ["shake", "vibrate", "tremble", "quake"].includes(word))) {
          animationType = "shake"
        } else if (promptWords.some((word) => ["fade", "dissolve", "appear", "disappear"].includes(word))) {
          animationType = "fade"
        }

        // Create a dummy video URL for the animation feed
        setVideoResult(`data:video/mp4;base64,${animationType}-offline-animation`)
        setAiGenerated(true)

        // Show a toast explaining we're using offline mode
        toast({
          title: "Using Offline Animation",
          description: `Created a ${animationType} animation based on your prompt. External service is unavailable.`,
        })
      }

      setIsGenerating(false)
      setProgressPercentage(100)
    }, 1500)
  }

  // Add this function to the component, after the existing functions but before the return statement:
  const downloadAnimation = () => {
    if (!videoResult && !manualVideoResult) return

    const videoUrl = animationMode === "ai" ? videoResult : manualVideoResult
    if (!videoUrl) return

    // Skip downloading for offline animations
    if (
      videoUrl.startsWith("data:video/mp4;base64,") &&
      (videoUrl.includes("-offline-animation") || !videoUrl.includes(","))
    ) {
      toast({
        title: "Download Unavailable",
        description: "This animation is in offline mode and cannot be downloaded.",
        variant: "destructive",
      })
      return
    }

    // Create a timestamp for the filename
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${animationMode === "ai" ? selectedModel : effect}-animation-${timestamp}.mp4`

    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a")
    a.href = videoUrl
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Remove toast notification
    // toast({
    //   title: "Download Started",
    //   description: "Your animation is being downloaded",
    // })
  }

  // Update the saveAnimation function to include video URL for manual animations
  const saveAnimation = () => {
    // Create animation object
    const animation: Animation = {
      id: `anim-${Date.now()}`,
      image: panel,
      effect: animationMode === "ai" ? "ai" : effect,
      settings:
        animationMode === "ai"
          ? {
              prompt: aiPrompt,
              model: selectedModel,
              videoUrl: videoResult,
            }
          : {
              videoUrl: manualVideoResult, // Only include the video URL
            },
      createdAt: new Date(),
    }

    // Save animation
    onSaveAnimation(animation)

    // Remove toast notification
    // toast({
    //   title: "Animation Saved",
    //   description: "Your animation has been added to the feed",
    // })
  }

  const getAnimationClass = () => {
    if (!isPlaying) return ""

    if (animationMode === "ai" && aiGenerated) {
      return "ai-animation"
    }

    switch (effect) {
      case "zoom":
        return "zoom-20" // Default intensity
      case "shake":
        return "shake-20" // Default intensity
      case "reveal":
        return "reveal-left-to-right" // Default direction
      default:
        return ""
    }
  }

  return (
    <Card className="w-full max-w-4xl">
      <CardHeader>
        <CardTitle>Animate Panel</CardTitle>
        <CardDescription>Create animations for your manga panel</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <Tabs defaultValue="manual" onValueChange={(value) => setAnimationMode(value as "ai" | "manual")}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="manual" className="flex items-center">
              <Sliders className="mr-2 h-4 w-4" />
              Manual Effects
            </TabsTrigger>
            <TabsTrigger value="ai" className="flex items-center">
              <Wand2 className="mr-2 h-4 w-4" />
              AI Animation
            </TabsTrigger>
          </TabsList>

          {/* Preview area - shared between tabs */}
          <div className="mt-4 border rounded-md overflow-hidden bg-black max-w-md mx-auto">
            <div className="relative aspect-square">
              {animationMode === "ai" && aiGenerated && videoResult ? (
                videoResult.startsWith("data:video/mp4;base64,") ? (
                  // For offline mode animations, show the image with CSS animation
                  <Image
                    src={panel || "/placeholder.svg"}
                    alt="AI Generated Animation"
                    fill
                    className={cn(
                      "object-contain",
                      videoResult.includes("zoom")
                        ? "zoom-20"
                        : videoResult.includes("pan")
                          ? "pan-right"
                          : videoResult.includes("shake")
                            ? "shake-20"
                            : videoResult.includes("fade")
                              ? "fade-30"
                              : "ai-animation",
                    )}
                    unoptimized={isExternalUrl}
                  />
                ) : (
                  // For real videos, show the video element
                  <video
                    src={videoResult}
                    alt="AI Generated Animation"
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                )
              ) : manualVideoResult && animationMode === "manual" ? (
                manualVideoResult.startsWith("data:video/mp4;base64,") ? (
                  // For offline mode animations, show the image with CSS animation
                  <Image
                    src={panel || "/placeholder.svg"}
                    alt="Manual Animation"
                    fill
                    className={cn("object-contain", getAnimationClass())}
                    unoptimized={isExternalUrl}
                  />
                ) : (
                  // For real videos, show the video element
                  <video
                    src={manualVideoResult}
                    alt="Manual Animation"
                    controls
                    autoPlay
                    loop
                    muted
                    className="w-full h-full object-contain"
                  />
                )
              ) : (
                <Image
                  src={panel || "/placeholder.svg"}
                  alt="Panel for animation"
                  fill
                  className={cn("object-contain", getAnimationClass())}
                  unoptimized={isExternalUrl} // Disable optimization for external URLs
                />
              )}
              {manualVideoLoading && animationMode === "manual" && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex flex-col items-center space-y-2 max-w-[80%] text-center">
                    <Loader2 className="h-8 w-8 text-white animate-spin" />
                    <p className="text-white font-medium">Generating Animation...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual Animation Tab */}
          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Animation Effect</Label>
                    <Select value={effect} onValueChange={setEffect}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select effect" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="zoom">Zoom</SelectItem>
                        <SelectItem value="reveal">Reveal</SelectItem>
                        <SelectItem value="shake">Shake</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="flex items-center space-x-2 mt-8">
                    <Switch id="loop-animation" checked={loopAnimation} onCheckedChange={setLoopAnimation} />
                    <Label htmlFor="loop-animation">Loop Animation</Label>
                  </div>
                </div>

                <div className="flex justify-center gap-4 mt-2">
                  {manualVideoResult ? (
                    <Button variant="outline" onClick={() => setManualVideoResult(null)} className="w-full">
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Reset Animation
                    </Button>
                  ) : (
                    <Button
                      variant="default"
                      onClick={generateManualAnimation}
                      disabled={manualVideoLoading}
                      className="w-full"
                    >
                      {manualVideoLoading ? (
                        <>
                          <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Wand2 className="mr-2 h-4 w-4" />
                          Generate Animation
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* AI Animation Tab */}
          <TabsContent value="ai" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 gap-4">
              <div className="space-y-4">
                {/* AI Model Selection */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>AI Model</Label>
                    <Select
                      value={selectedModel}
                      onValueChange={(value) => setSelectedModel(value as "vidu" | "wan" | "cogvideox")}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select AI model" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="vidu">VIDU Q1</SelectItem>
                        <SelectItem value="wan">Wan 2.1</SelectItem>
                        <SelectItem value="cogvideox">CogVideoX (my-checkpoint)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-0 mt-7">
                    <p className="text-xs text-muted-foreground">
                      {selectedModel === "vidu"
                        ? "VIDU Q1: Better for detailed animations (up to 10 min)"
                        : selectedModel === "wan"
                          ? "Wan 2.1: Faster manga-style animations (1-2 min)"
                          : "CogVideoX: Custom checkpoint for specialized animations"}
                    </p>
                  </div>
                </div>

                {/* Animation Prompt */}
                <div className="space-y-2">
                  <Label htmlFor="ai-prompt">Animation Prompt</Label>
                  <Textarea
                    id="ai-prompt"
                    placeholder="Describe how you want to animate this panel..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    rows={3}
                    className="resize-none"
                  />
                </div>

                {/* Generate Button */}
                <Button className="w-full" onClick={generateAiAnimation} disabled={isGenerating || !aiPrompt.trim()}>
                  {isGenerating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating with{" "}
                      {selectedModel === "vidu" ? "VIDU Q1" : selectedModel === "wan" ? "Wan 2.1" : "CogVideoX"}...
                    </>
                  ) : videoResult ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Regenerate Animation
                    </>
                  ) : (
                    <>
                      <Wand2 className="mr-2 h-4 w-4" />
                      Generate Animation
                    </>
                  )}
                </Button>

                {/* Demo Animation Button (when error) */}
                {videoError && videoError.includes("unavailable") && (
                  <Button variant="outline" className="w-full" onClick={useDemoAnimation}>
                    <Play className="mr-2 h-4 w-4" />
                    Use Demo Animation
                  </Button>
                )}

                {/* Error Alert */}
                {videoError && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Connection Error</AlertTitle>
                    <AlertDescription className="space-y-2">
                      <p>{videoError}</p>
                      {videoError.includes("unavailable") && (
                        <p className="text-sm">
                          The animation service may be temporarily down. Please try again later or use the manual
                          animation options.
                        </p>
                      )}
                    </AlertDescription>
                  </Alert>
                )}

                {/* Progress Logs */}
                {selectedModel === "vidu" && progressLogs.length > 0 && (
                  <div className="mt-2 border rounded p-2 bg-muted/10 text-xs max-h-[100px] overflow-y-auto">
                    <p className="font-medium mb-1">Processing logs:</p>
                    {progressLogs.map((log, index) => (
                      <div key={index} className="text-muted-foreground">
                        {log.includes("Completed") ? <p className="text-green-600">{log}</p> : <p>{log}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <style jsx global>{`
          /* Base animation durations */
          .zoom-5, .zoom-10, .zoom-15, .zoom-20, .zoom-25, .zoom-30, .zoom-35, .zoom-40, .zoom-45, .zoom-50 {
            animation: zoom-animation 3s ${loopAnimation ? "infinite" : "1"} alternate ease-in-out;
          }
          
          .pan-left, .pan-right, .pan-up, .pan-down {
            animation: pan-animation 4s ${loopAnimation ? "infinite" : "1"} alternate ease-in-out;
          }
          
          .fade-10, .fade-20, .fade-30, .fade-40, .fade-50, .fade-60, .fade-70, .fade-80, .fade-90 {
            animation: fade-animation 2s ${loopAnimation ? "infinite" : "1"} alternate ease-in-out;
          }
          
          .reveal-left-to-right, .reveal-right-to-left, .reveal-top-to-bottom, .reveal-bottom-to-top {
            animation: reveal-animation 3s ${loopAnimation ? "infinite" : "1"} ease-in-out;
          }
          
          .ai-animation {
            animation: ai-animation 5s ${loopAnimation ? "infinite" : "1"} alternate ease-in-out;
          }
          
          /* Zoom animations */
          .zoom-5 { --zoom-scale: 1.05; }
          .zoom-10 { --zoom-scale: 1.1; }
          .zoom-15 { --zoom-scale: 1.15; }
          .zoom-20 { --zoom-scale: 1.2; }
          .zoom-25 { --zoom-scale: 1.25; }
          .zoom-30 { --zoom-scale: 1.3; }
          .zoom-35 { --zoom-scale: 1.35; }
          .zoom-40 { --zoom-scale: 1.4; }
          .zoom-45 { --zoom-scale: 1.45; }
          .zoom-50 { --zoom-scale: 1.5; }
          
          @keyframes zoom-animation {
            from { transform: scale(1); transform-origin: center; }
            to { transform: scale(var(--zoom-scale, 1.2)); transform-origin: center; }
          }
          
          /* Pan animations */
          .pan-left { --pan-x: -10%; --pan-y: 0; }
          .pan-right { --pan-x: 10%; --pan-y: 0; }
          .pan-up { --pan-x: 0; --pan-y: -10%; }
          .pan-down { --pan-x: 0; --pan-y: 10%; }
          
          @keyframes pan-animation {
            from { transform: translate(0, 0); transform-origin: center; }
            to { transform: translate(var(--pan-x, 0), var(--pan-y, 0)); transform-origin: center; }
          }
          
          /* Fade animations */
          .fade-10 { --fade-opacity: 0.9; }
          .fade-20 { --fade-opacity: 0.8; }
          .fade-30 { --fade-opacity: 0.7; }
          .fade-40 { --fade-opacity: 0.6; }
          .fade-50 { --fade-opacity: 0.5; }
          .fade-60 { --fade-opacity: 0.4; }
          .fade-70 { --fade-opacity: 0.3; }
          .fade-80 { --fade-opacity: 0.2; }
          .fade-90 { --fade-opacity: 0.1; }
          
          @keyframes fade-animation {
            from { opacity: 1; }
            to { opacity: var(--fade-opacity, 0.7); }
          }
          
          /* Reveal animations */
          .reveal-left-to-right {
            animation-name: reveal-animation-ltr;
          }
          .reveal-right-to-left {
            animation-name: reveal-animation-rtl;
          }
          .reveal-top-to-bottom {
            animation-name: reveal-animation-ttb;
          }
          .reveal-bottom-to-top {
            animation-name: reveal-animation-btt;
          }
          
          @keyframes reveal-animation-ltr {
            0% { clip-path: inset(0 100% 0 0); }
            100% { clip-path: inset(0 0 0 0); }
          }
          @keyframes reveal-animation-rtl {
            0% { clip-path: inset(0 0 0 100%); }
            100% { clip-path: inset(0 0 0 0); }
          }
          @keyframes reveal-animation-ttb {
            0% { clip-path: inset(0 0 100% 0); }
            100% { clip-path: inset(0 0 0 0); }
          }
          @keyframes reveal-animation-btt {
            0% { clip-path: inset(100% 0 0 0); }
            100% { clip-path: inset(0 0 0 0); }
          }
          
          /* AI animation */
          @keyframes ai-animation {
            0% { transform: scale(1); filter: brightness(1); }
            25% { transform: scale(1.05) translateX(2%); filter: brightness(1.05); }
            50% { transform: scale(1.1) translateY(-2%); filter: brightness(1.1); }
            75% { transform: scale(1.05) translateX(-2%); filter: brightness(1.05); }
            100% { transform: scale(1); filter: brightness(1); }
          }

          /* Shake animations */
          .shake-5, .shake-10, .shake-15, .shake-20, .shake-25, .shake-30 {
            animation: shake-animation 0.5s ${loopAnimation ? "infinite" : "1"} ease-in-out;
          }

          .shake-5 { --shake-amount: 2px; }
          .shake-10 { --shake-amount: 4px; }
          .shake-15 { --shake-amount: 6px; }
          .shake-20 { --shake-amount: 8px; }
          .shake-25 { --shake-amount: 10px; }
          .shake-30 { --shake-amount: 12px; }

          @keyframes shake-animation {
            0% { transform: translate(0, 0); }
            25% { transform: translate(var(--shake-amount, 5px), var(--shake-amount, 5px)); }
            50% { transform: translate(calc(var(--shake-amount, 5px) * -1), var(--shake-amount, 5px)); }
            75% { transform: translate(var(--shake-amount, 5px), calc(var(--shake-amount, 5px) * -1)); }
            100% { transform: translate(0, 0); }
          }
        `}</style>
      </CardContent>
      <CardFooter className="flex justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft size={16} className="mr-2" />
          Back
        </Button>
        <div className="flex gap-2">
          {(videoResult || manualVideoResult) && (
            <Button variant="outline" onClick={downloadAnimation} className="bg-secondary hover:bg-secondary/90">
              <Download className="mr-2 h-4 w-4" />
              Download Animation
            </Button>
          )}
          <Button
            className="bg-primary hover:bg-primary/90"
            onClick={saveAnimation}
            disabled={(animationMode === "ai" && !videoResult) || (animationMode === "manual" && !manualVideoResult)}
          >
            <Save className="mr-2 h-4 w-4" />
            Save to Feed
          </Button>
        </div>
      </CardFooter>
    </Card>
  )
}
