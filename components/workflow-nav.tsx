"use client"

import { Upload, Crop, Palette, Play } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"

interface WorkflowNavProps {
  currentStep: "upload" | "crop" | "colorize" | "animate"
  onStepChange: (step: "upload" | "crop" | "colorize" | "animate") => void
  disabledSteps?: ("upload" | "crop" | "colorize" | "animate")[]
}

export function WorkflowNav({ currentStep, onStepChange, disabledSteps = [] }: WorkflowNavProps) {
  const steps = [
    {
      id: "upload" as const,
      icon: Upload,
      label: "Upload",
    },
    {
      id: "crop" as const,
      icon: Crop,
      label: "Crop",
    },
    {
      id: "colorize" as const,
      icon: Palette,
      label: "Colorize",
    },
    {
      id: "animate" as const,
      icon: Play,
      label: "Animate",
    },
  ]

  return (
    <TooltipProvider>
      <div className="bg-background border-b h-14 flex items-center justify-center px-4 mb-4">
        <div className="flex items-center space-x-2">
          {steps.map((step, index) => {
            const isDisabled = disabledSteps.includes(step.id)
            const isActive = currentStep === step.id

            return (
              <Tooltip key={step.id}>
                <TooltipTrigger asChild>
                  <Button
                    variant={isActive ? "default" : "ghost"}
                    size="icon"
                    className={cn(
                      "relative h-10 w-10",
                      isActive && "bg-primary text-primary-foreground",
                      isDisabled && "opacity-50 cursor-not-allowed",
                    )}
                    onClick={() => !isDisabled && onStepChange(step.id)}
                    disabled={isDisabled}
                  >
                    <step.icon className="h-5 w-5" />
                    {index < steps.length - 1 && (
                      <div className="absolute -right-2 top-1/2 -translate-y-1/2 h-[1px] w-3 bg-border" />
                    )}
                  </Button>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{step.label}</p>
                </TooltipContent>
              </Tooltip>
            )
          })}
        </div>
      </div>
    </TooltipProvider>
  )
}
