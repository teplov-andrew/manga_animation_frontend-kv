"use client"

import { useState, useEffect, useRef } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Loader2, Download, ArrowUp, ArrowDown, X, Film, Music } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { AlertCircle } from "lucide-react"
import { type MusicTrack, MusicLibrary } from "@/components/music-library"

interface Animation {
  id: string
  image: string
  effect: string
  settings: Record<string, any>
  createdAt: Date
}

interface VideoMergerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  selectedAnimations: Animation[]
  onClearSelection: () => void
}

export function VideoMerger({ open, onOpenChange, selectedAnimations, onClearSelection }: VideoMergerProps) {
  const [orderedAnimations, setOrderedAnimations] = useState<Animation[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [mergedVideoData, setMergedVideoData] = useState<any>(null)
  const [processingProgress, setProcessingProgress] = useState(0)
  const { toast } = useToast()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const videoContainerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  // State for tracking which video is currently playing in the sequence
  const [currentVideoIndex, setCurrentVideoIndex] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)

  // New state for anime settings
  const [animeTitle, setAnimeTitle] = useState("My Manga Animation")
  const [clipDuration, setClipDuration] = useState(3)
  const [transitionType, setTransitionType] = useState("fade")
  const [transitionDuration, setTransitionDuration] = useState(0.5)
  const [addBackgroundMusic, setAddBackgroundMusic] = useState(false)
  const [musicStyle, setMusicStyle] = useState("anime")
  const [activeTab, setActiveTab] = useState("clips")
  const [outputFormat, setOutputFormat] = useState("mp4")
  const [outputQuality, setOutputQuality] = useState("high")
  const [aspectRatio, setAspectRatio] = useState("9:16")
  const [addCredits, setAddCredits] = useState(true)
  const [backgroundColor, setBackgroundColor] = useState("#FFFFFF") // Default white background
  const [selectedMusicTrack, setSelectedMusicTrack] = useState<MusicTrack | null>(null)

  // Update ordered animations when selected animations change
  useEffect(() => {
    setOrderedAnimations([...selectedAnimations])
  }, [selectedAnimations])

  // Handle video playback
  useEffect(() => {
    if (!mergedVideoData || !videoContainerRef.current) return

    // Clear the container first
    while (videoContainerRef.current.firstChild) {
      videoContainerRef.current.removeChild(videoContainerRef.current.firstChild)
    }

    // Set the background color of the container
    if (videoContainerRef.current) {
      videoContainerRef.current.style.backgroundColor = backgroundColor
    }

    // If we have a file_url from the API, show that video
    if (mergedVideoData.file_url) {
      console.log("Displaying merged video from API:", mergedVideoData.file_url)

      // Create a video element for the merged video
      const videoElement = document.createElement("video")
      videoElement.src = mergedVideoData.file_url
      videoElement.controls = true
      videoElement.autoplay = true
      videoElement.loop = true
      videoElement.muted = false
      videoElement.className = "w-full h-full object-contain"

      // Apply aspect ratio
      if (aspectRatio === "16:9") {
        videoContainerRef.current.style.aspectRatio = "16/9"
      } else if (aspectRatio === "4:3") {
        videoContainerRef.current.style.aspectRatio = "4/3"
      } else if (aspectRatio === "1:1") {
        videoContainerRef.current.style.aspectRatio = "1/1"
      } else if (aspectRatio === "9:16") {
        videoContainerRef.current.style.aspectRatio = "9/16"
      }

      // Append the video
      videoContainerRef.current.appendChild(videoElement)
      setIsPlaying(true)

      return () => {
        if (videoElement) {
          videoElement.pause()
          videoElement.src = ""
          videoElement.load()
        }
      }
    }
    // Fallback to showing individual videos in sequence if no file_url
    else if (mergedVideoData.videos) {
      const videos = mergedVideoData.videos
      if (!videos || videos.length === 0) return

      // Create video elements for each video in the sequence
      const createVideoSequence = () => {
        // Create and append videos
        videos.forEach((videoUrl: string, index: number) => {
          const videoWrapper = document.createElement("div")
          videoWrapper.className = "absolute inset-0 flex items-center justify-center"
          videoWrapper.style.display = index === 0 ? "flex" : "none"
          videoWrapper.style.backgroundColor = backgroundColor // Set background color for each wrapper

          const video = document.createElement("video")
          video.src = videoUrl
          video.className = "max-w-full max-h-full object-contain"
          video.style.maxWidth = "100%"
          video.style.maxHeight = "100%"
          video.muted = true
          video.playsInline = true

          // Apply aspect ratio
          if (aspectRatio === "16:9") {
            videoWrapper.style.aspectRatio = "16/9"
          } else if (aspectRatio === "4:3") {
            videoWrapper.style.aspectRatio = "4/3"
          } else if (aspectRatio === "1:1") {
            videoWrapper.style.aspectRatio = "1/1"
          } else if (aspectRatio === "9:16") {
            videoWrapper.style.aspectRatio = "9/16"
          }

          // Add transition effect
          if (transitionType === "fade") {
            videoWrapper.style.transition = `opacity ${transitionDuration}s ease-in-out`
            videoWrapper.style.opacity = index === 0 ? "1" : "0"
          } else if (transitionType === "slide") {
            videoWrapper.style.transition = `transform ${transitionDuration}s ease-in-out`
            videoWrapper.style.transform = index === 0 ? "translateX(0)" : "translateX(100%)"
          } else if (transitionType === "zoom") {
            videoWrapper.style.transition = `transform ${transitionDuration}s ease-in-out`
            videoWrapper.style.transform = index === 0 ? "scale(1)" : "scale(0.5)"
          }

          videoWrapper.appendChild(video)
          videoContainerRef.current?.appendChild(videoWrapper)

          // Handle video ended event to play the next video
          video.addEventListener("ended", () => {
            if (index < videos.length - 1) {
              // Hide current video with transition
              if (transitionType === "fade") {
                videoWrapper.style.opacity = "0"
              } else if (transitionType === "slide") {
                videoWrapper.style.transform = "translateX(-100%)"
              } else if (transitionType === "zoom") {
                videoWrapper.style.transform = "scale(1.5)"
              }

              setTimeout(() => {
                videoWrapper.style.display = "none"

                // Show next video
                const nextWrapper = videoContainerRef.current?.children[index + 1] as HTMLElement
                if (nextWrapper) {
                  nextWrapper.style.display = "flex"
                  setTimeout(() => {
                    if (transitionType === "fade") {
                      nextWrapper.style.opacity = "1"
                    } else if (transitionType === "slide") {
                      nextWrapper.style.transform = "translateX(0)"
                    } else if (transitionType === "zoom") {
                      nextWrapper.style.transform = "scale(1)"
                    }
                    const nextVideo = nextWrapper.querySelector("video")
                    if (nextVideo) nextVideo.play()
                  }, 50)
                }
                setCurrentVideoIndex(index + 1)
              }, transitionDuration * 1000)
            } else {
              // Last video ended, loop back to the first
              if (transitionType === "fade") {
                videoWrapper.style.opacity = "0"
              } else if (transitionType === "slide") {
                videoWrapper.style.transform = "translateX(-100%)"
              } else if (transitionType === "zoom") {
                videoWrapper.style.transform = "scale(1.5)"
              }

              setTimeout(() => {
                videoWrapper.style.display = "none"

                // Show first video
                const firstWrapper = videoContainerRef.current?.children[0] as HTMLElement
                if (firstWrapper) {
                  firstWrapper.style.display = "flex"
                  setTimeout(() => {
                    if (transitionType === "fade") {
                      firstWrapper.style.opacity = "1"
                    } else if (transitionType === "slide") {
                      firstWrapper.style.transform = "translateX(0)"
                    } else if (transitionType === "zoom") {
                      firstWrapper.style.transform = "scale(1)"
                    }
                    const firstVideo = firstWrapper.querySelector("video")
                    if (firstVideo) firstVideo.play()
                  }, 50)
                }
                setCurrentVideoIndex(0)
              }, transitionDuration * 1000)
            }
          })
        })

        // Start playing the first video
        const firstWrapper = videoContainerRef.current?.children[0] as HTMLElement
        if (firstWrapper) {
          const firstVideo = firstWrapper.querySelector("video")
          if (firstVideo) {
            firstVideo.play()
            setIsPlaying(true)
          }
        }
      }

      createVideoSequence()

      // Cleanup function
      return () => {
        if (videoContainerRef.current) {
          const videos = videoContainerRef.current.querySelectorAll("video")
          videos.forEach((video) => {
            video.pause()
            video.removeAttribute("src")
            video.load()
          })
        }
      }
    }
  }, [mergedVideoData, transitionDuration, transitionType, aspectRatio, backgroundColor])

  // Handle play/pause for videos
  const togglePlayback = () => {
    if (!videoContainerRef.current) return

    const videos = videoContainerRef.current.querySelectorAll("video")
    if (videos.length === 0) return

    if (isPlaying) {
      // Pause all videos
      videos.forEach((video) => video.pause())
    } else {
      // If we have a single video (from API)
      if (mergedVideoData?.file_url) {
        const video = videoContainerRef.current.querySelector("video")
        if (video) video.play()
      }
      // If we have a sequence of videos
      else if (mergedVideoData?.videos) {
        // Play the current video in the sequence
        const currentWrapper = videoContainerRef.current.children[currentVideoIndex] as HTMLElement
        if (currentWrapper) {
          const currentVideo = currentWrapper.querySelector("video")
          if (currentVideo) currentVideo.play()
        }
      }
    }

    setIsPlaying(!isPlaying)
  }

  // Handle drag and drop reordering
  const handleDragEnd = (result: any) => {
    if (!result.destination) return

    const items = Array.from(orderedAnimations)
    const [reorderedItem] = items.splice(result.source.index, 1)
    items.splice(result.destination.index, 0, reorderedItem)

    setOrderedAnimations(items)
  }

  // Move an animation up in the order
  const moveUp = (index: number) => {
    if (index <= 0) return
    const newOrder = [...orderedAnimations]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index - 1]
    newOrder[index - 1] = temp
    setOrderedAnimations(newOrder)
  }

  // Move an animation down in the order
  const moveDown = (index: number) => {
    if (index >= orderedAnimations.length - 1) return
    const newOrder = [...orderedAnimations]
    const temp = newOrder[index]
    newOrder[index] = newOrder[index + 1]
    newOrder[index + 1] = temp
    setOrderedAnimations(newOrder)
  }

  // Remove an animation from the list
  const removeAnimation = (id: string) => {
    setOrderedAnimations(orderedAnimations.filter((a) => a.id !== id))
  }

  // Process the videos and create a merged video using the new API
  const processVideos = async () => {
    if (orderedAnimations.length === 0) return

    setIsProcessing(true)
    setProcessingProgress(0)
    setMergedVideoData(null)
    setCurrentVideoIndex(0)
    setIsPlaying(false)
    setError(null)

    try {
      // Prepare the video URLs
      const videoUrls = orderedAnimations
        .map((animation) => animation.settings.videoUrl)
        .filter((url): url is string => !!url)

      // Include music track if selected
      const musicTrack = addBackgroundMusic && selectedMusicTrack ? selectedMusicTrack.url : null

      // Log the music selection
      if (musicTrack) {
        console.log("Including music track:", selectedMusicTrack?.name, selectedMusicTrack?.url)
      }

      if (videoUrls.length === 0) {
        throw new Error("No valid video URLs found in the selected animations")
      }

      // Simulate progress updates while the API is processing
      const progressInterval = setInterval(() => {
        setProcessingProgress((prev) => {
          const newProgress = prev + Math.floor(Math.random() * 5) + 1
          return newProgress > 95 ? 95 : newProgress
        })
      }, 500)

      try {
        // Call our API to create the anime
        const response = await fetch("/api/create-anime", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            videos: videoUrls,
            music: musicTrack, // This is the S3 URL from the selected music track
            settings: {
              title: animeTitle,
              backgroundColor,
            },
          }),
        })

        clearInterval(progressInterval)

        if (!response.ok) {
          const errorText = await response.text().catch(() => "Unknown error")
          throw new Error(`API error: ${response.status} - ${errorText}`)
        }

        const data = await response.json()

        if (data.error) {
          throw new Error(data.error)
        }

        setProcessingProgress(100)

        if (data.file_url) {
          setMergedVideoData({
            file_url: data.file_url,
            file_name: data.file_name || "anime-video.mp4",
          })

          // Remove toast notification
          // toast({
          //   title: "Anime Created Successfully",
          //   description: `Created "${animeTitle}" with ${orderedAnimations.length} clips`,
          // })
        } else {
          throw new Error("No video URL in response")
        }
      } catch (apiError) {
        clearInterval(progressInterval)
        throw apiError
      }
    } catch (error) {
      console.error("Error creating anime:", error)
      setError(`Error creating anime: ${error instanceof Error ? error.message : "Unknown error"}`)

      toast({
        title: "Error Creating Anime",
        description: "There was a problem creating your anime video",
        variant: "destructive",
      })

      // Fallback to preview mode
      setMergedVideoData({
        videos: orderedAnimations.map((animation) => animation.settings.videoUrl).filter((url): url is string => !!url),
      })
    } finally {
      setIsProcessing(false)
    }
  }

  // Download the merged video
  const downloadMergedVideo = () => {
    if (!mergedVideoData || !mergedVideoData.file_url) return

    // Create an anchor element and trigger download
    const a = document.createElement("a")
    a.href = mergedVideoData.file_url
    a.download = mergedVideoData.file_name || `${animeTitle.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.mp4`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)

    // Remove toast notification
    // toast({
    //   title: "Download Started",
    //   description: "Your anime video is being downloaded",
    // })
  }

  // Reset the merger state
  const resetMerger = () => {
    setMergedVideoData(null)
    setCurrentVideoIndex(0)
    setIsPlaying(false)
    setError(null)
    onClearSelection()
    onOpenChange(false)
  }

  // Get animation type label
  const getAnimationType = (animation: Animation) => {
    if (animation.effect === "ai") {
      return `AI: ${animation.settings.model || "Unknown"}`
    }

    switch (animation.effect) {
      case "zoom":
        return "Zoom"
      case "pan":
        return "Pan"
      case "fade":
        return "Fade"
      case "reveal":
        return "Reveal"
      default:
        return animation.effect
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[800px] max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle>Create Anime from Selected Clips</DialogTitle>
          <DialogDescription>Arrange your clips and customize settings to create your anime video.</DialogDescription>
        </DialogHeader>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="flex-1 overflow-hidden flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clips" className="flex items-center">
              <Film className="mr-2 h-4 w-4" />
              Clips ({orderedAnimations.length})
            </TabsTrigger>
            <TabsTrigger value="settings" className="flex items-center">
              <Music className="mr-2 h-4 w-4" />
              Music & Settings
            </TabsTrigger>
          </TabsList>

          <div className="flex-1 overflow-hidden mt-4">
            <TabsContent value="clips" className="h-full flex flex-col md:flex-row gap-4 m-0">
              {/* Left side: Clip ordering */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium mb-2">Arrange Clips</h3>

                {orderedAnimations.length > 0 ? (
                  <ScrollArea className="h-[200px] border rounded-md">
                    <DragDropContext onDragEnd={handleDragEnd}>
                      <Droppable droppableId="clips">
                        {(provided) => (
                          <div {...provided.droppableProps} ref={provided.innerRef} className="p-2 space-y-1">
                            {orderedAnimations.map((animation, index) => (
                              <Draggable key={animation.id} draggableId={animation.id} index={index}>
                                {(provided) => (
                                  <div
                                    ref={provided.innerRef}
                                    {...provided.draggableProps}
                                    {...provided.dragHandleProps}
                                    className="border rounded-md p-2 bg-card flex items-center gap-2"
                                  >
                                    <div className="flex-shrink-0 w-6 h-6 bg-muted rounded flex items-center justify-center">
                                      <span className="text-xs font-medium">{index + 1}</span>
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <p className="text-xs font-medium truncate">
                                        {animation.effect === "ai"
                                          ? (animation.settings.prompt || `AI Clip ${index + 1}`).substring(0, 20)
                                          : `${animation.effect.charAt(0).toUpperCase() + animation.effect.slice(1)}`}
                                      </p>
                                    </div>
                                    <div className="flex gap-1">
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveUp(index)}
                                        disabled={index === 0}
                                      >
                                        <ArrowUp className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6"
                                        onClick={() => moveDown(index)}
                                        disabled={index === orderedAnimations.length - 1}
                                      >
                                        <ArrowDown className="h-3 w-3" />
                                      </Button>
                                      <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-6 w-6 text-muted-foreground hover:text-destructive"
                                        onClick={() => removeAnimation(animation.id)}
                                      >
                                        <X className="h-3 w-3" />
                                      </Button>
                                    </div>
                                  </div>
                                )}
                              </Draggable>
                            ))}
                            {provided.placeholder}
                          </div>
                        )}
                      </Droppable>
                    </DragDropContext>
                  </ScrollArea>
                ) : (
                  <div className="h-[300px] border rounded-md flex items-center justify-center">
                    <p className="text-muted-foreground text-center">No clips selected</p>
                  </div>
                )}
              </div>

              {/* Right side: Preview or result */}
              <div className="flex-1 min-w-0">
                <h3 className="text-sm font-medium mb-2">Preview</h3>
                <div className="border rounded-md overflow-hidden bg-white relative">
                  <div className="aspect-video">
                    {isProcessing ? (
                      <div className="absolute inset-0 flex flex-col items-center justify-center">
                        <Loader2 className="h-6 w-6 text-primary animate-spin mb-2" />
                        <p className="text-sm font-medium">Processing...</p>
                        <div className="w-36 h-2 bg-muted rounded-full mt-2 overflow-hidden">
                          <div
                            className="h-full bg-primary transition-all duration-300"
                            style={{ width: `${processingProgress}%` }}
                          ></div>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">{processingProgress}%</p>
                      </div>
                    ) : mergedVideoData ? (
                      <div className="relative w-full h-full">
                        {/* Video container for the sequence */}
                        <div
                          ref={videoContainerRef}
                          className="w-full h-full relative bg-white"
                          style={{ backgroundColor }}
                        >
                          {/* Videos will be dynamically added here */}
                        </div>

                        {/* Playback controls */}
                        <div className="absolute bottom-2 right-2 flex space-x-2">
                          <Button
                            variant="secondary"
                            size="sm"
                            className="bg-background/80 backdrop-blur-sm h-7 text-xs px-2"
                            onClick={togglePlayback}
                          >
                            {isPlaying ? "Pause" : "Play"}
                          </Button>
                        </div>

                        {/* Progress indicator for preview mode (only show for video sequences) */}
                        {mergedVideoData.videos && !mergedVideoData.file_url && (
                          <div className="absolute bottom-0 left-0 right-0 h-1 bg-muted/30">
                            <div
                              className="h-full bg-primary transition-all duration-300"
                              style={{
                                width: `${(currentVideoIndex / (mergedVideoData.videos.length || 1)) * 100}%`,
                              }}
                            ></div>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="absolute inset-0 flex items-center justify-center bg-white">
                        <div className="text-center">
                          <Film className="h-8 w-8 text-muted-foreground mx-auto mb-2" />
                          <p className="text-xs text-muted-foreground px-4">
                            {orderedAnimations.length > 0
                              ? "Click 'Create Anime' to merge your selected clips"
                              : "Select clips to merge"}
                          </p>
                        </div>
                      </div>
                    )}

                    {/* Canvas for video processing (hidden) */}
                    <canvas ref={canvasRef} className="hidden" width="1920" height="1080"></canvas>
                  </div>
                </div>

                {/* Error message */}
                {error && (
                  <Alert variant="destructive" className="mt-4">
                    <AlertCircle className="h-4 w-4" />
                    <AlertTitle>Error</AlertTitle>
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}
              </div>
            </TabsContent>

            <TabsContent value="settings" className="h-full m-0">
              <ScrollArea className="h-[300px] pr-4">
                <div className="space-y-6">
                  {/* Basic Settings */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Basic Settings</h3>

                    <div className="space-y-2">
                      <Label htmlFor="anime-title">Anime Title</Label>
                      <Input
                        id="anime-title"
                        value={animeTitle}
                        onChange={(e) => setAnimeTitle(e.target.value)}
                        placeholder="Enter a title for your anime"
                      />
                    </div>
                  </div>

                  {/* Music Settings - Make this the primary focus */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium">Music Settings</h3>

                    <div className="flex items-center space-x-2">
                      <Switch id="add-music" checked={addBackgroundMusic} onCheckedChange={setAddBackgroundMusic} />
                      <Label htmlFor="add-music">Add Background Music</Label>
                    </div>

                    {addBackgroundMusic && (
                      <div className="space-y-4 border rounded-md p-4 bg-card/50">
                        <h4 className="text-sm font-medium mb-2">Select Music Track</h4>
                        <p className="text-xs text-muted-foreground mb-4">Choose from your Yandex Cloud music tracks</p>

                        <MusicLibrary onSelectTrack={setSelectedMusicTrack} selectedTrackId={selectedMusicTrack?.id} />

                        {selectedMusicTrack && (
                          <div className="mt-4 p-3 bg-primary/10 rounded-md flex items-center justify-between">
                            <div>
                              <p className="text-sm font-medium">{selectedMusicTrack.name}</p>
                              <p className="text-xs text-muted-foreground">{selectedMusicTrack.artist}</p>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => setSelectedMusicTrack(null)}
                              className="h-8 px-2"
                            >
                              Change
                            </Button>
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </ScrollArea>
            </TabsContent>
          </div>
        </Tabs>

        <DialogFooter className="flex justify-between">
          <Button variant="outline" onClick={resetMerger}>
            Cancel
          </Button>
          <div className="flex gap-2">
            {mergedVideoData && mergedVideoData.file_url ? (
              <Button onClick={downloadMergedVideo} className="bg-primary hover:bg-primary/90">
                <Download className="mr-2 h-4 w-4" />
                Download Anime
              </Button>
            ) : (
              <Button
                onClick={processVideos}
                disabled={isProcessing || orderedAnimations.length === 0}
                className="bg-primary hover:bg-primary/90"
              >
                {isProcessing ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Processing...
                  </>
                ) : (
                  <>
                    <Film className="mr-2 h-4 w-4" />
                    Create Anime
                  </>
                )}
              </Button>
            )}
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
