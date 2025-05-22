"use client"
import { MusicLibrary } from "@/components/music-library"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function MusicPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex items-center justify-between mb-8">
        <Button variant="outline" onClick={() => router.back()}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <h1 className="text-3xl font-bold">Music Library</h1>
        <div className="w-[100px]"></div> {/* Spacer for centering */}
      </div>

      <p className="text-muted-foreground mt-2">
        Manage your music tracks for manga animations. Pre-loaded tracks from Yandex Cloud are available.
      </p>

      <div className="max-w-4xl mx-auto">
        <MusicLibrary />
      </div>
    </div>
  )
}
