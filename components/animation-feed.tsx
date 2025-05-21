"use client"

import { useState } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Play, Pause, Calendar, Clock, X, Info, Download, Check, Film } from "lucide-react"
import Image from "next/image"
import { formatDistanceToNow } from "date-fns"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
// Remove the Badge import
import { VideoMerger } from "@/components/video-merger"
import { useToast } from "@/components/ui/use-toast"

interface Animation {
  id: string
  image: string
  effect: string
  settings: Record<string, any>
  createdAt: Date
}

interface AnimationFeedProps {
  animations: Animation[]
  onDeleteAnimation?: (id: string) => void
}

export function AnimationFeed({ animations, onDeleteAnimation }: AnimationFeedProps) {
  const [playingAnimationId, setPlayingAnimationId] = useState<string | null>(null)
  const [selectedAnimation, setSelectedAnimation] = useState<Animation | null>(null)
  const [showDetails, setShowDetails] = useState(false)
  const { toast } = useToast()

  // New state for video selection and merging
  const [selectedAnimations, setSelectedAnimations] = useState<Animation[]>([])
  const [showMerger, setShowMerger] = useState(false)

  const togglePlayback = (id: string) => {
    setPlayingAnimationId(playingAnimationId === id ? null : id)

    // Find any videos and control playback
    setTimeout(() => {
      const videos = document.querySelectorAll("video")
      videos.forEach((video) => {
        if (playingAnimationId === id) {
          video.pause()
        } else if (id === video.closest("[data-animation-id]")?.getAttribute("data-animation-id")) {
          video.play()
        }
      })
    }, 10)
  }

  const viewAnimationDetails = (animation: Animation) => {
    setSelectedAnimation(animation)
    setShowDetails(true)
    // Start playing the animation in the details view
    setPlayingAnimationId(animation.id)
  }

  // Toggle selection of an animation for merging
  const toggleAnimationSelection = (animation: Animation) => {
    if (selectedAnimations.some((a) => a.id === animation.id)) {
      setSelectedAnimations(selectedAnimations.filter((a) => a.id !== animation.id))
    } else {
      setSelectedAnimations([...selectedAnimations, animation])
    }
  }

  // Open the video merger dialog
  const openVideoMerger = () => {
    if (selectedAnimations.length > 0) {
      setShowMerger(true)
    }
  }

  // Clear all selections
  const clearSelections = () => {
    setSelectedAnimations([])
  }

  const getAnimationClass = (animation: Animation) => {
    if (playingAnimationId !== animation.id) return ""

    if (animation.effect === "ai") {
      return "ai-animation"
    }

    switch (animation.effect) {
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

  const formatDate = (date: Date) => {
    return formatDistanceToNow(date, { addSuffix: true })
  }

  const getEffectName = (animation: Animation) => {
    if (animation.effect === "ai") {
      return "AI Animation"
    }

    // Simplified effect names
    switch (animation.effect) {
      case "zoom":
        return "Zoom"
      case "shake":
        return "Shake"
      case "reveal":
        return "Reveal"
      default:
        return animation.effect
    }
  }

  const getEffectDescription = (animation: Animation) => {
    if (animation.effect === "ai") {
      return `AI-generated animation using prompt: "${animation.settings.prompt || "No prompt provided"}"`
    }

    // Simplified effect descriptions
    switch (animation.effect) {
      case "zoom":
        return "Zoom animation effect"
      case "shake":
        return "Shake animation effect"
      case "reveal":
        return "Reveal animation effect"
      default:
        return "Standard animation effect"
    }
  }

  // Handle downloading animation videos
  const handleDownload = (animation: Animation) => {
    if (!animation) return

    // Check if we have a video URL
    const videoUrl = animation.settings.videoUrl
    if (!videoUrl) {
      toast({
        title: "Download Failed",
        description: "No video available for this animation",
        variant: "destructive",
      })
      return
    }

    // Create a filename based on the animation effect and date
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-")
    const filename = `${animation.effect}-animation-${timestamp}.mp4`

    // Create a temporary anchor element to trigger the download
    const a = document.createElement("a")
    a.href = videoUrl
    a.download = filename
    a.style.display = "none"
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    toast({
      title: "Download Started",
      description: "Your animation is being downloaded",
    })
  }

  const renderAnimationContent = (animation: Animation) => {
    // Check if this is an animation with a video URL (either AI or manual)
    if (animation.settings.videoUrl) {
      // Check if this is an offline animation (base64 string that doesn't start with data:)
      if (
        typeof animation.settings.videoUrl === "string" &&
        animation.settings.videoUrl.startsWith("data:video/mp4;base64,") &&
        !animation.settings.videoUrl.includes(",AAA")
      ) {
        // Extract the effect from the dummy URL
        const effect = animation.settings.videoUrl.split("data:video/mp4;base64,")[1].split("-")[0]

        // Return a div with the appropriate CSS animation class
        return (
          <div className="w-full h-full bg-black flex items-center justify-center">
            <div className="relative w-full h-full">
              <Image
                src={animation.image || "/placeholder.svg"}
                alt="Offline Animation"
                fill
                className={`object-contain ${effect}-20`}
              />
              <div className="absolute bottom-2 right-2 bg-black/50 text-white text-xs px-2 py-1 rounded">
                Offline Mode
              </div>
            </div>
          </div>
        )
      }

      // Regular video URL handling (unchanged)
      return (
        <div className="w-full h-full bg-black flex items-center justify-center">
          <video
            src={animation.settings.videoUrl}
            autoPlay={playingAnimationId === animation.id}
            loop
            muted
            playsInline
            className="object-contain w-full h-full"
          />
        </div>
      )
    }

    // Otherwise render the image with animation class
    return (
      <div className="w-full h-full overflow-hidden">
        <Image
          src={animation.image || "/placeholder.svg"}
          alt="Animated panel"
          fill
          className={cn("object-contain", getAnimationClass(animation))}
        />
      </div>
    )
  }

  // Filter animations to only show those with video URLs for merging (both AI and manual)
  const videoAnimations = animations.filter((animation) => animation.settings.videoUrl)

  if (animations.length === 0) {
    return (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Animation Feed</CardTitle>
          <CardDescription>Your saved animations will appear here</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center justify-center py-12">
          <p className="text-muted-foreground text-center">No animations saved yet</p>
          <p className="text-sm text-muted-foreground text-center mt-2">
            Create and save animations to see them in your feed
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="w-full">
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Animation Feed</CardTitle>
            <CardDescription>Your saved animations</CardDescription>
          </div>

          {/* Video Merger Controls */}
          {videoAnimations.length > 0 && (
            <div className="flex items-center gap-2">
              {selectedAnimations.length > 0 && (
                <Button variant="outline" size="sm" onClick={clearSelections}>
                  Clear Selection ({selectedAnimations.length})
                </Button>
              )}
              <Button
                onClick={openVideoMerger}
                disabled={selectedAnimations.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                <Film className="mr-2 h-4 w-4" />
                Create Anime ({selectedAnimations.length})
              </Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[500px] pr-4">
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {animations.map((animation) => {
                const isSelected = selectedAnimations.some((a) => a.id === animation.id)
                const canBeSelected = animation.settings.videoUrl !== undefined

                return (
                  <Card
                    key={animation.id}
                    className={cn("overflow-hidden", isSelected && "ring-2 ring-primary")}
                    data-animation-id={animation.id}
                  >
                    <CardContent className="p-0">
                      <div className="relative aspect-square overflow-hidden">
                        {renderAnimationContent(animation)}
                        <div className="absolute bottom-0 left-0 right-0 bg-background/80 backdrop-blur-sm p-1 flex justify-between items-center">
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            onClick={() => togglePlayback(animation.id)}
                          >
                            {playingAnimationId === animation.id ? (
                              <Pause className="h-3 w-3" />
                            ) : (
                              <Play className="h-3 w-3" />
                            )}
                          </Button>
                          <div className="flex gap-1">
                            {canBeSelected && (
                              <Button
                                variant={isSelected ? "default" : "ghost"}
                                size="icon"
                                className="h-6 w-6"
                                onClick={() => toggleAnimationSelection(animation)}
                              >
                                <Check className={cn("h-3 w-3", isSelected ? "opacity-100" : "opacity-50")} />
                              </Button>
                            )}
                            <Button
                              variant="ghost"
                              size="icon"
                              className="h-6 w-6"
                              onClick={() => viewAnimationDetails(animation)}
                            >
                              <Info className="h-3 w-3" />
                            </Button>
                          </div>
                        </div>

                        {/* Selection indicator */}
                        {isSelected && (
                          <div className="absolute top-1 right-1 bg-primary text-primary-foreground rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold">
                            {selectedAnimations.findIndex((a) => a.id === animation.id) + 1}
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="flex justify-between py-1 px-2">
                      <div className="text-xs truncate">{getEffectName(animation)}</div>
                      <div className="flex items-center gap-1">
                        {animation.settings.videoUrl && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-primary"
                            onClick={() => handleDownload(animation)}
                          >
                            <Download className="h-3 w-3" />
                          </Button>
                        )}
                        {onDeleteAnimation && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6 text-muted-foreground hover:text-destructive"
                            onClick={() => onDeleteAnimation(animation.id)}
                          >
                            <X className="h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardFooter>
                  </Card>
                )
              })}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Animation Details Dialog */}
      <Dialog open={showDetails} onOpenChange={setShowDetails}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Animation Details</DialogTitle>
            <DialogDescription>
              Created {selectedAnimation && formatDate(selectedAnimation.createdAt)}
            </DialogDescription>
          </DialogHeader>

          {selectedAnimation && (
            <div className="space-y-6">
              <div className="relative border rounded-md overflow-hidden bg-black max-w-md mx-auto">
                <div className="aspect-square">{selectedAnimation && renderAnimationContent(selectedAnimation)}</div>
                <div className="absolute bottom-2 right-2 flex space-x-2">
                  <Button
                    variant="secondary"
                    size="sm"
                    className="bg-background/80 backdrop-blur-sm h-7 text-xs"
                    onClick={() => togglePlayback(selectedAnimation.id)}
                  >
                    {playingAnimationId === selectedAnimation.id ? (
                      <>
                        <Pause className="h-3 w-3 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-3 w-3 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-medium">Effect</h3>
                  <div className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold bg-secondary text-secondary-foreground mt-1">
                    {getEffectName(selectedAnimation)}
                  </div>
                  <p className="text-sm text-muted-foreground mt-2">{getEffectDescription(selectedAnimation)}</p>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-sm font-medium">Created</h4>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <Calendar className="h-4 w-4 mr-2" />
                      {formatDate(selectedAnimation.createdAt)}
                    </p>
                  </div>
                  <div>
                    <h4 className="text-sm font-medium">Animation Type</h4>
                    <p className="text-sm text-muted-foreground flex items-center mt-1">
                      <Clock className="h-4 w-4 mr-2" />
                      {selectedAnimation.effect === "ai" ? "AI Generated" : "Manual Effect"}
                    </p>
                  </div>
                </div>

                <div className="flex justify-between pt-4 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-[120px]"
                    onClick={() => handleDownload(selectedAnimation)}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download
                  </Button>
                  {onDeleteAnimation && (
                    <Button
                      variant="destructive"
                      size="sm"
                      className="w-[120px]"
                      onClick={() => {
                        onDeleteAnimation(selectedAnimation.id)
                        setShowDetails(false)
                      }}
                    >
                      <X className="h-4 w-4 mr-2" />
                      Delete
                    </Button>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Video Merger Dialog */}
      <VideoMerger
        open={showMerger}
        onOpenChange={setShowMerger}
        selectedAnimations={selectedAnimations}
        onClearSelection={clearSelections}
      />

      <style jsx global>{`
        /* Container styles to prevent animations from overflowing */
        .relative {
          overflow: hidden;
        }

        /* Base animation durations */
        .zoom-5, .zoom-10, .zoom-15, .zoom-20, .zoom-25, .zoom-30, .zoom-35, .zoom-40, .zoom-45, .zoom-50 {
          animation: zoom-animation 3s infinite alternate ease-in-out;
        }

        .pan-left, .pan-right, .pan-up, .pan-down {
          animation: pan-animation 4s infinite alternate ease-in-out;
        }

        .fade-10, .fade-20, .fade-30, .fade-40, .fade-50, .fade-60, .fade-70, .fade-80, .fade-90 {
          animation: fade-animation 2s infinite alternate ease-in-out;
        }

        .reveal-left-to-right, .reveal-right-to-left, .reveal-top-to-bottom, .reveal-bottom-to-top {
          animation: reveal-animation 3s infinite ease-in-out;
        }

        .ai-animation {
          animation: ai-animation 5s infinite alternate ease-in-out;
        }

        /* Zoom animations */
        .zoom-5 {
          --zoom-scale: 1.05;
        }

        .zoom-10 {
          --zoom-scale: 1.1;
        }

        .zoom-15 {
          --zoom-scale: 1.15;
        }

        .zoom-20 {
          --zoom-scale: 1.2;
        }

        .zoom-25 {
          --zoom-scale: 1.25;
        }

        .zoom-30 {
          --zoom-scale: 1.3;
        }

        .zoom-35 {
          --zoom-scale: 1.35;
        }

        .zoom-40 {
          --zoom-scale: 1.4;
        }

        .zoom-45 {
          --zoom-scale: 1.45;
        }

        .zoom-50 {
          --zoom-scale: 1.5;
        }

        @keyframes zoom-animation {
          from {
            transform: scale(1);
            transform-origin: center;
          }

          to {
            transform: scale(var(--zoom-scale, 1.2));
            transform-origin: center;
          }
        }

        /* Pan animations */
        .pan-left {
          --pan-x: -10%;
          --pan-y: 0;
        }

        .pan-right {
          --pan-x: 10%;
          --pan-y: 0;
        }

        .pan-up {
          --pan-x: 0;
          --pan-y: -10%;
        }

        .pan-down {
          --pan-x: 0;
          --pan-y: 10%;
        }

        @keyframes pan-animation {
          from {
            transform: translate(0, 0);
            transform-origin: center;
          }

          to {
            transform: translate(var(--pan-x, 0), var(--pan-y, 0));
            transform-origin: center;
          }
        }

        /* Fade animations */
        .fade-10 {
          --fade-opacity: 0.9;
        }

        .fade-20 {
          --fade-opacity: 0.8;
        }

        .fade-30 {
          --fade-opacity: 0.7;
        }

        .fade-40 {
          --fade-opacity: 0.6;
        }

        .fade-50 {
          --fade-opacity: 0.5;
        }

        .fade-60 {
          --fade-opacity: 0.4;
        }

        .fade-70 {
          --fade-opacity: 0.3;
        }

        .fade-80 {
          --fade-opacity: 0.2;
        }

        .fade-90 {
          --fade-opacity: 0.1;
        }

        @keyframes fade-animation {
          from {
            opacity: 1;
          }

          to {
            opacity: var(--fade-opacity, 0.7);
          }
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
          0% {
            clip-path: inset(0 100% 0 0);
          }

          100% {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes reveal-animation-rtl {
          0% {
            clip-path: inset(0 0 0 100%);
          }

          100% {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes reveal-animation-ttb {
          0% {
            clip-path: inset(0 0 100% 0);
          }

          100% {
            clip-path: inset(0 0 0 0);
          }
        }

        @keyframes reveal-animation-btt {
          0% {
            clip-path: inset(100% 0 0 0);
          }

          100% {
            clip-path: inset(0 0 0 0);
          }
        }

        /* AI animation */
        @keyframes ai-animation {
          0% {
            transform: scale(1);
            filter: brightness(1);
          }

          25% {
            transform: scale(1.05) translateX(2%);
            filter: brightness(1.05);
          }

          50% {
            transform: scale(1.1) translateY(-2%);
            filter: brightness(1.1);
          }

          75% {
            transform: scale(1.05) translateX(-2%);
            filter: brightness(1.05);
          }

          100% {
            transform: scale(1);
            filter: brightness(1);
          }
        }

        /* Shake animations */
        .shake-5,
        .shake-10,
        .shake-15,
        .shake-20,
        .shake-25,
        .shake-30 {
          animation: shake-animation 0.5s infinite ease-in-out;
        }

        .shake-5 {
          --shake-amount: 2px;
        }

        .shake-10 {
          --shake-amount: 4px;
        }

        .shake-15 {
          --shake-amount: 6px;
        }

        .shake-20 {
          --shake-amount: 8px;
        }

        .shake-25 {
          --shake-amount: 10px;
        }

        .shake-30 {
          --shake-amount: 12px;
        }

        @keyframes shake-animation {
          0% {
            transform: translate(0, 0);
          }

          25% {
            transform: translate(var(--shake-amount, 5px), var(--shake-amount, 5px));
          }

          50% {
            transform: translate(calc(var(--shake-amount, 5px) * -1), var(--shake-amount, 5px));
          }

          75% {
            transform: translate(var(--shake-amount, 5px), calc(var(--shake-amount, 5px) * -1));
          }

          100% {
            transform: translate(0, 0);
          }
        }
      `}</style>
    </>
  )
}
