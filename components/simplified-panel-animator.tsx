"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { ArrowLeft, Play, Pause, RotateCcw, Save, Wand2, Sliders, Loader2, RefreshCw } from "lucide-react"
import Image from "next/image"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"
import { useRouter } from "next/navigation"
import { cn } from "@/lib/utils"

interface SimplifiedPanelAnimatorProps {
  panel: string
  onBack: () => void
}

export function SimplifiedPanelAnimator({ panel, onBack }: SimplifiedPanelAnimatorProps) {
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
  const router = useRouter()

  const [manualVideoResult, setManualVideoResult] = useState<string | null>(null)
  const [manualVideoLoading, setManualVideoLoading] = useState(false)

  const togglePlayback = () => {
    setIsPlaying(!isPlaying)
  }

  const resetAnimation = () => {
    setIsPlaying(false)
  }

  const generateAiAnimation = () => {
    setIsGenerating(true)

    // Simulate AI processing
    setTimeout(() => {
      setIsGenerating(false)
      setAiGenerated(true)
      setIsPlaying(true)
      toast({
        title: "Animation Generated",
        description: "AI has created your animation",
      })
    }, 2000)
  }

  const generateManualAnimation = async () => {
    setManualVideoLoading(true)
    setManualVideoResult(null)

    try {
      // Convert base64 image to a Blob
      const response = await fetch(panel)
      const blob = await response.blob()

      // Create FormData
      const formData = new FormData()
      formData.append("file", blob, "panel.jpg")
      formData.append("effect", effect)

      // Call our proxy API
      const apiResponse = await fetch("/api/proxy-manual-animation", {
        method: "POST",
        body: formData,
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
        setIsPlaying(true)
        toast({
          title: "Animation Generated",
          description: `Successfully created ${effect} animation`,
        })
      } else {
        throw new Error("No video URL in response")
      }
    } catch (err) {
      console.error("Error generating manual animation:", err)

      toast({
        title: "Animation Failed",
        description: "Could not generate animation. Please try again.",
        variant: "destructive",
      })
    } finally {
      setManualVideoLoading(false)
    }
  }

  const saveAnimation = () => {
    // Create animation object
    const animation = {
      id: `anim-${Date.now()}`,
      projectId: "current",
      image: panel,
      effect: animationMode === "ai" ? "ai" : effect,
      settings:
        animationMode === "ai"
          ? { prompt: aiPrompt }
          : {
              videoUrl: manualVideoResult,
            },
      createdAt: new Date(),
    }

    // Save to localStorage
    const savedAnimations = localStorage.getItem("mangaAnimations")
    const animations = savedAnimations ? JSON.parse(savedAnimations) : []
    animations.push(animation)
    localStorage.setItem("mangaAnimations", JSON.stringify(animations))

    // Show success toast
    toast({
      title: "Animation Saved",
      description: "Your animation has been added to the feed",
    })

    // Navigate to feed
    router.push("/feed")
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
          <div className="mt-4 border rounded-md overflow-hidden bg-white max-w-md mx-auto">
            <div className="relative aspect-square">
              {manualVideoResult && animationMode === "manual" ? (
                <video
                  src={manualVideoResult}
                  alt="Manual Animation"
                  controls
                  autoPlay
                  loop
                  muted
                  className="w-full h-full object-contain"
                />
              ) : (
                <Image
                  src={panel || "/placeholder.svg"}
                  alt="Panel for animation"
                  fill
                  className={cn("object-contain", getAnimationClass())}
                />
              )}
              {manualVideoLoading && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/40">
                  <div className="flex flex-col items-center space-y-2">
                    <Loader2 className="h-6 w-6 text-white animate-spin" />
                    <p className="text-white text-sm">Generating animation...</p>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Manual Animation Tab */}
          <TabsContent value="manual" className="space-y-4 pt-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-4">
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
              </div>

              <div className="space-y-4">
                <div className="flex items-center space-x-2">
                  <Switch id="loop-animation" checked={loopAnimation} onCheckedChange={setLoopAnimation} />
                  <Label htmlFor="loop-animation">Loop Animation</Label>
                </div>

                <div className="flex space-x-2 mt-6">
                  {manualVideoResult ? (
                    <>
                      <Button variant={isPlaying ? "default" : "outline"} onClick={togglePlayback} className="flex-1">
                        {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {isPlaying ? "Pause" : "Play"}
                      </Button>
                      <Button variant="outline" onClick={() => setManualVideoResult(null)} className="flex-1">
                        <RefreshCw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </>
                  ) : (
                    <>
                      <Button
                        variant="default"
                        onClick={generateManualAnimation}
                        disabled={manualVideoLoading}
                        className="flex-1"
                      >
                        {manualVideoLoading ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Generating...
                          </>
                        ) : (
                          <>
                            <Wand2 className="mr-2 h-4 w-4" />
                            Generate
                          </>
                        )}
                      </Button>
                      <Button
                        variant={isPlaying ? "default" : "outline"}
                        onClick={togglePlayback}
                        className="flex-1"
                        disabled={manualVideoLoading}
                      >
                        {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                        {isPlaying ? "Pause" : "Play"}
                      </Button>
                      <Button
                        variant="outline"
                        onClick={resetAnimation}
                        className="flex-1"
                        disabled={manualVideoLoading}
                      >
                        <RotateCcw className="mr-2 h-4 w-4" />
                        Reset
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </div>
          </TabsContent>

          {/* AI Animation Tab */}
          <TabsContent value="ai" className="space-y-4 pt-4">
            <div className="space-y-4">
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

              <Button
                className="w-full"
                onClick={generateAiAnimation}
                disabled={isGenerating || !aiPrompt.trim() || aiGenerated}
              >
                <Wand2 className="mr-2 h-4 w-4" />
                {isGenerating ? "Generating..." : aiGenerated ? "Generated" : "Generate Animation"}
              </Button>

              <div className="flex space-x-2 mt-2">
                <Button
                  variant={isPlaying ? "default" : "outline"}
                  onClick={togglePlayback}
                  disabled={!aiGenerated}
                  className="flex-1"
                >
                  {isPlaying ? <Pause className="mr-2 h-4 w-4" /> : <Play className="mr-2 h-4 w-4" />}
                  {isPlaying ? "Pause" : "Play"}
                </Button>
                <Button variant="outline" onClick={resetAnimation} disabled={!aiGenerated} className="flex-1">
                  <RotateCcw className="mr-2 h-4 w-4" />
                  Reset
                </Button>
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
            from { transform: scale(1); }
            to { transform: scale(var(--zoom-scale, 1.2)); }
          }
          
          /* Pan animations */
          .pan-left { --pan-x: -10%; --pan-y: 0; }
          .pan-right { --pan-x: 10%; --pan-y: 0; }
          .pan-up { --pan-x: 0; --pan-y: -10%; }
          .pan-down { --pan-x: 0; --pan-y: 10%; }
          
          @keyframes pan-animation {
            from { transform: translate(0, 0); }
            to { transform: translate(var(--pan-x, 0), var(--pan-y, 0)); }
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
        <Button
          className="bg-primary hover:bg-primary/90"
          onClick={saveAnimation}
          disabled={animationMode === "manual" && !manualVideoResult}
        >
          <Save className="mr-2 h-4 w-4" />
          Save to Feed
        </Button>
      </CardFooter>
    </Card>
  )
}
