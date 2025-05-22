"use client"

import type React from "react"

import { useState, useEffect, useRef } from "react"
import { ImageIcon, Loader2, Save, Edit, Upload } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import Image from "next/image"
import type { Project, Animation } from "@/types/project"
import { PanelCropper } from "@/components/panel-cropper"
import { PanelAnimator } from "@/components/panel-animator"
import { PanelColorizer } from "@/components/panel-colorizer"

interface ProjectContentProps {
  project: Project
  onUpdateProject: (project: Project) => void
  currentStep: "upload" | "crop" | "colorize" | "animate"
  onStepChange: (step: "upload" | "crop" | "colorize" | "animate") => void
  onSaveAnimation: (animation: Animation) => void
}

export function ProjectContent({
  project,
  onUpdateProject,
  currentStep,
  onStepChange,
  onSaveAnimation,
}: ProjectContentProps) {
  const [isUploading, setIsUploading] = useState(false)
  const [isEditingName, setIsEditingName] = useState(false)
  const [projectName, setProjectName] = useState(project.name)
  const [showPanelCropper, setShowPanelCropper] = useState(false)
  const [selectedPanel, setSelectedPanel] = useState<string | null>(null)
  const [colorizedPanel, setColorizedPanel] = useState<string | null>(null)
  // Add a flag to track if we're navigating backwards
  const [isNavigatingBackward, setIsNavigatingBackward] = useState(false)
  // Add a ref to track the current project image
  const currentProjectImageRef = useRef<string | null>(null)

  // Update state when project changes
  useEffect(() => {
    setProjectName(project.name)

    // Track the current project image
    currentProjectImageRef.current = project.image

    // Only update these states if we're not in the middle of backward navigation
    if (!isNavigatingBackward) {
      setSelectedPanel(project.selectedPanel || null)
      setColorizedPanel(project.colorizedPanel || null)

      // Determine the current step based on project state
      if (!project.image) {
        onStepChange("upload")
        setShowPanelCropper(false)
      } else if (!project.panels || project.panels.length === 0) {
        onStepChange("crop")
        setShowPanelCropper(true)
      } else if (!project.selectedPanel) {
        onStepChange("crop")
        setShowPanelCropper(true)
      } else if (!project.colorizedPanel) {
        onStepChange("colorize")
        setShowPanelCropper(false)
      } else {
        // Only change to animate if we're not explicitly on another step
        if (currentStep !== "upload" && currentStep !== "crop" && currentStep !== "colorize") {
          onStepChange("animate")
        }
        setShowPanelCropper(false)
      }
    }
  }, [project, isNavigatingBackward, onStepChange, currentStep])

  // Update UI based on current step
  useEffect(() => {
    if (currentStep === "crop" && project.image) {
      setShowPanelCropper(true)
    } else if (currentStep === "upload") {
      setShowPanelCropper(false)
    }
  }, [currentStep, project.image])

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      setIsUploading(true)

      // Create a URL for the image
      const reader = new FileReader()
      reader.onload = (e) => {
        onUpdateProject({
          ...project,
          image: e.target?.result as string,
          panels: [], // Reset panels when uploading a new image
          selectedPanel: null, // Reset selected panel
          colorizedPanel: null, // Reset colorized panel
        })
        setIsUploading(false)
        setIsNavigatingBackward(false)
        onStepChange("crop")
      }
      reader.readAsDataURL(file)
    }
  }

  const handleNameSave = () => {
    onUpdateProject({
      ...project,
      name: projectName,
    })
    setIsEditingName(false)
  }

  const handlePanelsDetected = (panels: string[]) => {
    // Save all detected panels to the project
    onUpdateProject({
      ...project,
      panels: panels,
    })
  }

  const handlePanelSelected = (panel: string) => {
    // Log the panel data to verify color information is preserved
    console.log("Selected panel data (first 100 chars):", panel.substring(0, 100))
    console.log("Panel appears to be colorized:", !panel.includes("data:image/jpeg") || panel.length > 100000)

    // Save the selected panel and explicitly set the step to colorize
    setSelectedPanel(panel)
    setShowPanelCropper(false)
    onStepChange("colorize")

    // If we were navigating backward, we need to clear the colorized panel
    if (isNavigatingBackward) {
      onUpdateProject({
        ...project,
        selectedPanel: panel,
        colorizedPanel: null, // Clear the colorized panel when going back
      })
      // Reset the backward navigation flag
      setIsNavigatingBackward(false)
    } else {
      onUpdateProject({
        ...project,
        selectedPanel: panel,
      })
    }
  }

  // Update the handlePanelColorized function to ensure we're properly saving the colorized panel
  const handlePanelColorized = (colorizedPanel: string) => {
    // Save the colorized panel and move to animation step
    setColorizedPanel(colorizedPanel)
    onStepChange("animate")
    setIsNavigatingBackward(false)

    // Log the colorized panel data to verify it's being saved correctly
    console.log("Colorized panel saved in project content:", colorizedPanel.substring(0, 50) + "...")

    // Make sure we're updating the project with the colorized panel
    onUpdateProject({
      ...project,
      colorizedPanel: colorizedPanel,
    })
  }

  const handleSkipColorization = () => {
    // Skip colorization and use the original panel for animation
    onStepChange("animate")
    setIsNavigatingBackward(false)

    // Log that we're using the original panel (which may already be colorized)
    console.log("Skipping colorization, using original panel which may already be colorized")

    // Use the selected panel directly for animation
    onUpdateProject({
      ...project,
      colorizedPanel: selectedPanel || project.selectedPanel, // Use the original panel
    })
  }

  // Handle going back from animate to colorize
  const handleBackFromAnimate = () => {
    onStepChange("colorize")
    setIsNavigatingBackward(true)
    // We keep the selectedPanel but clear the colorizedPanel
    onUpdateProject({
      ...project,
      colorizedPanel: null,
    })
  }

  // Handle going back from colorize to crop
  const handleBackFromColorize = () => {
    onStepChange("crop")
    setShowPanelCropper(true)
    setIsNavigatingBackward(true)
    // Clear both selectedPanel and colorizedPanel
    onUpdateProject({
      ...project,
      selectedPanel: null,
      colorizedPanel: null,
    })
  }

  // Determine which component to render based on the current step
  const renderCurrentStep = () => {
    if ((showPanelCropper || currentStep === "crop") && project.image) {
      return (
        <PanelCropper
          projectImage={project.image}
          onPanelsDetected={handlePanelsDetected}
          onPanelSelected={handlePanelSelected}
          onCancel={() => {
            setShowPanelCropper(false)
            onStepChange("upload")
            setIsNavigatingBackward(false)
          }}
        />
      )
    }

    if (currentStep === "colorize" && (selectedPanel || project.selectedPanel)) {
      return (
        <PanelColorizer
          panel={selectedPanel || project.selectedPanel || ""}
          onColorized={handlePanelColorized}
          onBack={handleBackFromColorize}
          onSkip={handleSkipColorization}
        />
      )
    }

    if (currentStep === "animate" && (colorizedPanel || project.colorizedPanel)) {
      return (
        <PanelAnimator
          panel={colorizedPanel || project.colorizedPanel || ""}
          onBack={handleBackFromAnimate}
          onSaveAnimation={onSaveAnimation}
        />
      )
    }

    // Default to upload step
    return (
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Upload Manga Page</CardTitle>
          <CardDescription>Select a manga page image to begin the process</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col items-center space-y-4">
          <div className="border-2 border-dashed border-muted-foreground/30 rounded-lg p-12 w-full flex flex-col items-center justify-center hover:bg-muted/30 transition-colors">
            {isUploading ? (
              <Loader2 className="h-10 w-10 text-muted-foreground animate-spin" />
            ) : project.image ? (
              <div className="relative w-full aspect-[3/4] max-h-[300px]">
                <Image
                  src={project.image || "/placeholder.svg"}
                  alt={`${project.name} manga page`}
                  fill
                  className="object-contain"
                />
              </div>
            ) : (
              <>
                <ImageIcon className="h-10 w-10 text-muted-foreground mb-2" />
                <p className="text-sm text-muted-foreground text-center mb-4">
                  Click the button below to select your manga page
                </p>
                <Input
                  id={`file-upload-${project.id}`}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleFileChange}
                />
                <Button asChild variant="outline" size="lg" className="mt-2">
                  <label htmlFor={`file-upload-${project.id}`} className="cursor-pointer flex items-center">
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </label>
                </Button>
              </>
            )}
          </div>

          {project.image && (
            <div className="w-full">
              <Input
                id={`file-upload-replace-${project.id}`}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleFileChange}
              />
              <Button asChild variant="outline" className="w-full">
                <label
                  htmlFor={`file-upload-replace-${project.id}`}
                  className="cursor-pointer flex items-center justify-center"
                >
                  <Upload className="mr-2 h-4 w-4" />
                  Replace Image
                </label>
              </Button>
            </div>
          )}
        </CardContent>
        <CardFooter>
          <Button
            className="w-full bg-primary hover:bg-primary/90"
            disabled={!project.image || isUploading}
            onClick={() => {
              setShowPanelCropper(true)
              onStepChange("crop")
              setIsNavigatingBackward(false)
            }}
          >
            {project.image ? "Proceed to Panel Cropping" : "Upload an image to continue"}
          </Button>
        </CardFooter>
      </Card>
    )
  }

  return (
    <div className="container mx-auto px-4 py-2">
      <div className="flex flex-col items-center justify-center space-y-4">
        <div className="w-full max-w-md flex items-center justify-between">
          {isEditingName ? (
            <div className="flex items-center space-x-2 w-full">
              <Input value={projectName} onChange={(e) => setProjectName(e.target.value)} className="h-9" autoFocus />
              <Button size="sm" onClick={handleNameSave}>
                <Save size={16} className="mr-2" />
                Save
              </Button>
            </div>
          ) : (
            <div className="flex items-center">
              <h1 className="text-3xl font-bold tracking-tight mr-2">{project.name}</h1>
              <Button variant="ghost" size="icon" onClick={() => setIsEditingName(true)}>
                <Edit size={16} />
              </Button>
            </div>
          )}
        </div>

        <p className="text-muted-foreground text-center max-w-md mb-4">
          Transform your static manga pages into animated scenes using AI
        </p>

        {renderCurrentStep()}
      </div>
    </div>
  )
}
