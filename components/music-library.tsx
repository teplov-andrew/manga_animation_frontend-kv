"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Play, Pause, Plus, Music, Check, X, Volume2, VolumeX } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Slider } from "@/components/ui/slider"
import { useToast } from "@/components/ui/use-toast"
import { cn } from "@/lib/utils"

export interface MusicTrack {
  id: string
  name: string
  url: string
  duration?: number
  artist?: string
  genre?: string
}

interface MusicLibraryProps {
  onSelectTrack?: (track: MusicTrack | null) => void
  selectedTrackId?: string | null
}

export function MusicLibrary({ onSelectTrack, selectedTrackId }: MusicLibraryProps) {
  const [tracks, setTracks] = useState<MusicTrack[]>([])
  const [playingTrackId, setPlayingTrackId] = useState<string | null>(null)
  const [isAddingTrack, setIsAddingTrack] = useState(false)
  const [newTrackName, setNewTrackName] = useState("")
  const [newTrackUrl, setNewTrackUrl] = useState("")
  const [newTrackArtist, setNewTrackArtist] = useState("")
  const [newTrackGenre, setNewTrackGenre] = useState("")
  const [volume, setVolume] = useState(0.5)
  const [isMuted, setIsMuted] = useState(false)
  const [currentTime, setCurrentTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const { toast } = useToast()

  // Load tracks from localStorage on initial render or use predefined tracks if none exist
  useEffect(() => {
    const savedTracks = localStorage.getItem("mangaMusicTracks")
    if (savedTracks) {
      try {
        setTracks(JSON.parse(savedTracks))
      } catch (e) {
        console.error("Failed to parse saved tracks:", e)
        loadPredefinedTracks()
      }
    } else {
      // No saved tracks, load predefined tracks
      loadPredefinedTracks()
    }
  }, [])

  // Save tracks to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("mangaMusicTracks", JSON.stringify(tracks))
  }, [tracks])

  // Handle audio element events
  useEffect(() => {
    const audio = audioRef.current
    if (!audio) return

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime)
    }

    const handleLoadedMetadata = () => {
      setDuration(audio.duration)
    }

    const handleEnded = () => {
      setPlayingTrackId(null)
    }

    audio.addEventListener("timeupdate", handleTimeUpdate)
    audio.addEventListener("loadedmetadata", handleLoadedMetadata)
    audio.addEventListener("ended", handleEnded)

    return () => {
      audio.removeEventListener("timeupdate", handleTimeUpdate)
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata)
      audio.removeEventListener("ended", handleEnded)
    }
  }, [playingTrackId])

  // Update audio volume when volume state changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.volume = isMuted ? 0 : volume
    }
  }, [volume, isMuted])

  // Load predefined Yandex Cloud tracks
  const loadPredefinedTracks = () => {
    const predefinedTracks: MusicTrack[] = [
      {
        id: "track-1",
        name: "Epic Adventure Theme",
        url: "https://storage.yandexcloud.net/manymated/music/track1.mp3",
        artist: "Yandex Music",
        genre: "Epic",
      },
      {
        id: "track-2",
        name: "Emotional Journey",
        url: "https://storage.yandexcloud.net/manymated/music/track2.mp3",
        artist: "Yandex Music",
        genre: "Dramatic",
      },
      {
        id: "track-3",
        name: "Action Sequence",
        url: "https://storage.yandexcloud.net/manymated/music/track3.mp3",
        artist: "Yandex Music",
        genre: "Action",
      },
      {
        id: "track-4",
        name: "Mysterious Atmosphere",
        url: "https://storage.yandexcloud.net/manymated/music/track4.mp3",
        artist: "Yandex Music",
        genre: "Mystery",
      },
      {
        id: "track-5",
        name: "Peaceful Moment",
        url: "https://storage.yandexcloud.net/manymated/music/track5.mp3",
        artist: "Yandex Music",
        genre: "Relaxing",
      },
      {
        id: "track-6",
        name: "Battle Theme",
        url: "https://storage.yandexcloud.net/manymated/music/track6.mp3",
        artist: "Yandex Music",
        genre: "Action",
      },
    ]

    setTracks(predefinedTracks)
    localStorage.setItem("mangaMusicTracks", JSON.stringify(predefinedTracks))
  }

  // Play the selected track
  const playTrack = (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId)
    if (!track) return

    if (playingTrackId === trackId) {
      // Pause if already playing
      audioRef.current?.pause()
      setPlayingTrackId(null)
    } else {
      // Play new track
      setPlayingTrackId(trackId)

      if (audioRef.current) {
        audioRef.current.src = track.url
        audioRef.current.play().catch((error) => {
          console.error("Error playing audio:", error)
          toast({
            title: "Playback Error",
            description: "Could not play this track. Please check the URL.",
            variant: "destructive",
          })
          setPlayingTrackId(null)
        })
      }
    }
  }

  // Add a new track
  const addTrack = () => {
    if (!newTrackName || !newTrackUrl) {
      toast({
        title: "Missing Information",
        description: "Please provide both a name and URL for the track.",
        variant: "destructive",
      })
      return
    }

    // Validate URL format
    if (!newTrackUrl.startsWith("http")) {
      toast({
        title: "Invalid URL",
        description: "Please enter a valid URL starting with http:// or https://",
        variant: "destructive",
      })
      return
    }

    const newTrack: MusicTrack = {
      id: `track-${Date.now()}`,
      name: newTrackName,
      url: newTrackUrl,
      artist: newTrackArtist || "Unknown Artist",
      genre: newTrackGenre || "Unknown Genre",
    }

    setTracks([...tracks, newTrack])
    setNewTrackName("")
    setNewTrackUrl("")
    setNewTrackArtist("")
    setNewTrackGenre("")
    setIsAddingTrack(false)

    toast({
      title: "Track Added",
      description: `"${newTrackName}" has been added to your music library.`,
    })
  }

  // Remove a track
  const removeTrack = (trackId: string) => {
    if (playingTrackId === trackId) {
      audioRef.current?.pause()
      setPlayingTrackId(null)
    }

    setTracks(tracks.filter((track) => track.id !== trackId))

    // If the removed track was selected, clear the selection
    if (selectedTrackId === trackId && onSelectTrack) {
      onSelectTrack(null)
    }
  }

  // Select a track for the animation
  const selectTrack = (track: MusicTrack) => {
    if (onSelectTrack) {
      if (selectedTrackId === track.id) {
        onSelectTrack(null)
      } else {
        onSelectTrack(track)
      }
    }
  }

  // Format time in MM:SS
  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = Math.floor(seconds % 60)
    return `${mins}:${secs.toString().padStart(2, "0")}`
  }

  // Toggle mute
  const toggleMute = () => {
    setIsMuted(!isMuted)
  }

  // Seek to position in track
  const seekTo = (value: number[]) => {
    if (audioRef.current && playingTrackId) {
      audioRef.current.currentTime = value[0]
      setCurrentTime(value[0])
    }
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Music Library</CardTitle>
        <CardDescription>Manage and preview music tracks for your animations</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Audio element for playback */}
        <audio ref={audioRef} className="hidden" />

        {/* Track list */}
        {tracks.length > 0 ? (
          <ScrollArea className="h-[300px] pr-4">
            <div className="space-y-2">
              {tracks.map((track) => (
                <div
                  key={track.id}
                  className={cn(
                    "flex items-center justify-between p-3 rounded-md",
                    playingTrackId === track.id ? "bg-primary/10" : "bg-card hover:bg-muted/50",
                    selectedTrackId === track.id ? "border-2 border-primary" : "border border-border",
                  )}
                >
                  <div className="flex items-center space-x-3 flex-1 min-w-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 shrink-0"
                      onClick={() => playTrack(track.id)}
                    >
                      {playingTrackId === track.id ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                    </Button>
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{track.name}</p>
                      <p className="text-xs text-muted-foreground truncate">
                        {track.artist} • {track.genre}
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Button
                      variant={selectedTrackId === track.id ? "default" : "outline"}
                      size="sm"
                      onClick={() => selectTrack(track)}
                      className="h-8"
                    >
                      {selectedTrackId === track.id ? <Check className="h-4 w-4 mr-1" /> : null}
                      {selectedTrackId === track.id ? "Selected" : "Select"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-muted-foreground hover:text-destructive"
                      onClick={() => removeTrack(track.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </ScrollArea>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 border rounded-md">
            <Music className="h-12 w-12 text-muted-foreground mb-2" />
            <p className="text-muted-foreground">No music tracks added yet</p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setIsAddingTrack(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Track
            </Button>
          </div>
        )}

        {/* Playback controls */}
        {playingTrackId && (
          <div className="space-y-2 pt-2 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm">{formatTime(currentTime)}</p>
              <p className="text-sm">{formatTime(duration)}</p>
            </div>
            <Slider value={[currentTime]} max={duration || 100} step={0.1} onValueChange={seekTo} className="w-full" />
            <div className="flex items-center space-x-2">
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={toggleMute}>
                {isMuted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </Button>
              <Slider
                value={[volume * 100]}
                max={100}
                step={1}
                onValueChange={(value) => setVolume(value[0] / 100)}
                className="w-24"
              />
            </div>
          </div>
        )}

        {/* Add track form */}
        {isAddingTrack ? (
          <div className="space-y-4 border rounded-md p-4">
            <h3 className="font-medium">Add New Track</h3>
            <div className="space-y-2">
              <Label htmlFor="track-name">Track Name</Label>
              <Input
                id="track-name"
                value={newTrackName}
                onChange={(e) => setNewTrackName(e.target.value)}
                placeholder="Enter track name"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="track-url">Track URL (S3 Yandex Cloud link)</Label>
              <Input
                id="track-url"
                value={newTrackUrl}
                onChange={(e) => setNewTrackUrl(e.target.value)}
                placeholder="https://storage.yandexcloud.net/your-bucket/track.mp3"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="track-artist">Artist (Optional)</Label>
                <Input
                  id="track-artist"
                  value={newTrackArtist}
                  onChange={(e) => setNewTrackArtist(e.target.value)}
                  placeholder="Artist name"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="track-genre">Genre (Optional)</Label>
                <Input
                  id="track-genre"
                  value={newTrackGenre}
                  onChange={(e) => setNewTrackGenre(e.target.value)}
                  placeholder="Genre"
                />
              </div>
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setIsAddingTrack(false)}>
                Cancel
              </Button>
              <Button onClick={addTrack}>Add Track</Button>
            </div>
          </div>
        ) : (
          tracks.length > 0 && (
            <Button variant="outline" className="w-full" onClick={() => setIsAddingTrack(true)}>
              <Plus className="h-4 w-4 mr-1" />
              Add Track
            </Button>
          )
        )}
      </CardContent>
      <CardFooter className="flex justify-between">
        <p className="text-sm text-muted-foreground">
          {tracks.length} {tracks.length === 1 ? "track" : "tracks"} in library
        </p>
        {selectedTrackId && <p className="text-sm font-medium">Track selected for animation</p>}
      </CardFooter>
    </Card>
  )
}
