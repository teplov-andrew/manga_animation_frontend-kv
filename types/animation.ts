export interface Animation {
  id: string
  projectId: string
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
