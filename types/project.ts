export interface Animation {
  id: string
  image: string
  effect: string
  settings: Record<string, any> & {
    videoUrl?: string
    prompt?: string
    model?: string
    intensity?: number
    direction?: string
  }
  createdAt: Date
}

export interface Project {
  id: string
  name: string
  image: string | null
  panels?: string[]
  selectedPanel?: string | null
  colorizedPanel?: string | null
  animations?: Animation[]
}
