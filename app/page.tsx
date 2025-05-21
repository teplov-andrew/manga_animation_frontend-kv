"use client"

import { useState, useEffect } from "react"
import { Sidebar } from "@/components/sidebar"
import { ProjectContent } from "@/components/project-content"
import { WorkflowNav } from "@/components/workflow-nav"
import { AnimationFeed } from "@/components/animation-feed"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Toaster } from "@/components/ui/toaster"
import type { Project, Animation } from "@/types/project"

export default function MangaAnimationApp() {
  const [projects, setProjects] = useState<Project[]>([
    { id: "1", name: "Page 1", image: null, animations: [] },
    { id: "2", name: "Page 2", image: null, animations: [] },
  ])
  const [activeProjectId, setActiveProjectId] = useState<string>("1")
  const [currentStep, setCurrentStep] = useState<"upload" | "crop" | "colorize" | "animate">("upload")
  const [activeTab, setActiveTab] = useState<"workflow" | "feed">("workflow")

  // Load projects from localStorage on initial render
  useEffect(() => {
    const savedProjects = localStorage.getItem("mangaProjects")
    if (savedProjects) {
      try {
        const parsedProjects = JSON.parse(savedProjects)

        // Convert date strings back to Date objects
        const projectsWithDates = parsedProjects.map((project: any) => ({
          ...project,
          animations:
            project.animations?.map((anim: any) => ({
              ...anim,
              createdAt: new Date(anim.createdAt),
            })) || [],
        }))

        setProjects(projectsWithDates)
      } catch (e) {
        console.error("Failed to parse saved projects:", e)
      }
    }
  }, [])

  // Save projects to localStorage whenever they change
  useEffect(() => {
    localStorage.setItem("mangaProjects", JSON.stringify(projects))
  }, [projects])

  const addNewProject = () => {
    const newProject: Project = {
      id: `${Date.now()}`,
      name: `Page ${projects.length + 1}`,
      image: null,
      animations: [],
    }
    setProjects([...projects, newProject])
    setActiveProjectId(newProject.id)
  }

  const updateProject = (updatedProject: Project) => {
    setProjects(projects.map((project) => (project.id === updatedProject.id ? updatedProject : project)))
  }

  const deleteProject = (projectId: string) => {
    const filteredProjects = projects.filter((project) => project.id !== projectId)
    setProjects(filteredProjects)

    // If the active project is deleted, select the first available project
    if (projectId === activeProjectId && filteredProjects.length > 0) {
      setActiveProjectId(filteredProjects[0].id)
    }
  }

  const activeProject = projects.find((project) => project.id === activeProjectId) || projects[0]

  // Save an animation to the active project
  const saveAnimation = (animation: Animation) => {
    const updatedProject = {
      ...activeProject,
      animations: [...(activeProject.animations || []), animation],
    }
    updateProject(updatedProject)

    // Switch to the feed tab to show the newly saved animation
    setActiveTab("feed")
  }

  // Delete an animation from the active project
  const deleteAnimation = (animationId: string) => {
    if (!activeProject.animations) return

    const updatedAnimations = activeProject.animations.filter((animation) => animation.id !== animationId)

    const updatedProject = {
      ...activeProject,
      animations: updatedAnimations,
    }

    updateProject(updatedProject)
  }

  // Determine which steps should be disabled based on the current project state
  const getDisabledSteps = () => {
    const disabledSteps: ("upload" | "crop" | "colorize" | "animate")[] = []

    // Crop is disabled if there's no image
    if (!activeProject.image) {
      disabledSteps.push("crop", "colorize", "animate")
    }

    // Colorize is disabled if there are no panels or no selected panel
    if (!activeProject.panels || activeProject.panels.length === 0 || !activeProject.selectedPanel) {
      disabledSteps.push("colorize", "animate")
    }

    // Animate is disabled if there's no colorized panel
    if (!activeProject.colorizedPanel) {
      disabledSteps.push("animate")
    }

    return disabledSteps
  }

  // Handle step change from the workflow nav
  const handleStepChange = (step: "upload" | "crop" | "colorize" | "animate") => {
    setCurrentStep(step)
    setActiveTab("workflow")
  }

  return (
    <main className="flex h-screen bg-background overflow-hidden">
      <Sidebar
        projects={projects}
        activeProjectId={activeProjectId}
        onSelectProject={setActiveProjectId}
        onAddProject={addNewProject}
        onDeleteProject={deleteProject}
      />
      <div className="flex-1 overflow-auto flex flex-col">
        <WorkflowNav currentStep={currentStep} onStepChange={handleStepChange} disabledSteps={getDisabledSteps()} />

        <Tabs
          value={activeTab}
          onValueChange={(value) => setActiveTab(value as "workflow" | "feed")}
          className="flex-1"
        >
          <div className="container mx-auto px-4">
            <TabsList className="mb-4">
              <TabsTrigger value="workflow">Workflow</TabsTrigger>
              <TabsTrigger value="feed">Animation Feed</TabsTrigger>
            </TabsList>
          </div>

          <TabsContent value="workflow" className="flex-1">
            <ProjectContent
              project={activeProject}
              onUpdateProject={updateProject}
              currentStep={currentStep}
              onStepChange={setCurrentStep}
              onSaveAnimation={saveAnimation}
            />
          </TabsContent>

          <TabsContent value="feed" className="flex-1">
            <div className="container mx-auto px-4 py-2">
              <AnimationFeed animations={activeProject.animations || []} onDeleteAnimation={deleteAnimation} />
            </div>
          </TabsContent>
        </Tabs>
      </div>
      <Toaster />
    </main>
  )
}
