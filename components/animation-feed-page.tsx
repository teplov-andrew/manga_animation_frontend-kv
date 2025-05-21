"use client"

import { useState, useEffect } from "react"
import { AnimationFeed } from "@/components/animation-feed"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"
import type { Animation } from "@/types/animation"

export function AnimationFeedPage() {
  const [animations, setAnimations] = useState<Animation[]>([])
  const router = useRouter()

  // Load animations from localStorage on initial render
  useEffect(() => {
    const savedAnimations = localStorage.getItem("mangaAnimations")
    if (savedAnimations) {
      try {
        const parsedAnimations = JSON.parse(savedAnimations)
        setAnimations(parsedAnimations)
      } catch (e) {
        console.error("Failed to parse saved animations:", e)
      }
    }
  }, [])

  const handleDeleteAnimation = (id: string) => {
    const updatedAnimations = animations.filter((animation) => animation.id !== id)
    setAnimations(updatedAnimations)
    localStorage.setItem("mangaAnimations", JSON.stringify(updatedAnimations))
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Projects
        </Button>
        <h1 className="text-3xl font-bold">Animation Feed</h1>
        <div className="w-[100px]"></div> {/* Spacer for centering */}
      </div>

      <AnimationFeed animations={animations} onDeleteAnimation={handleDeleteAnimation} />
    </div>
  )
}
