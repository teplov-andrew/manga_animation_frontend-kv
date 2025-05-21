"use client"

import type React from "react"

// Simplified version of the toast hook
import { useState } from "react"

type ToastProps = {
  title?: string
  description?: string
  action?: React.ReactNode
  variant?: "default" | "destructive"
}

export const useToast = () => {
  const [toasts, setToasts] = useState<ToastProps[]>([])

  const toast = (props: ToastProps) => {
    setToasts((prevToasts) => [...prevToasts, props])

    // Remove toast after 5 seconds
    setTimeout(() => {
      setToasts((prevToasts) => prevToasts.filter((t) => t !== props))
    }, 5000)

    return props
  }

  return { toast, toasts }
}

export type { ToastProps }
