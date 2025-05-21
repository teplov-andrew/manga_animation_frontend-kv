"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { PlusCircle, Menu, X, Trash2, ChevronDown, ChevronRight } from "lucide-react"
import type { Project } from "@/types/project"
import { cn } from "@/lib/utils"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"

interface SidebarProps {
  projects: Project[]
  activeProjectId: string
  onSelectProject: (projectId: string) => void
  onAddProject: () => void
  onDeleteProject: (projectId: string) => void
}

export function Sidebar({ projects, activeProjectId, onSelectProject, onAddProject, onDeleteProject }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false)
  const [expandedProjects, setExpandedProjects] = useState<Record<string, boolean>>({})

  const toggleProjectExpanded = (projectId: string, e: React.MouseEvent) => {
    e.stopPropagation()
    setExpandedProjects((prev) => ({
      ...prev,
      [projectId]: !prev[projectId],
    }))
  }

  return (
    <div className={cn("h-full border-r bg-card transition-all duration-300", isCollapsed ? "w-16" : "w-64")}>
      <div className="flex h-14 items-center justify-between px-4 border-b">
        {!isCollapsed && <h2 className="text-lg font-semibold">Manga Projects</h2>}
        <Button
          variant="ghost"
          size="icon"
          onClick={() => setIsCollapsed(!isCollapsed)}
          className={cn(isCollapsed && "mx-auto")}
        >
          {isCollapsed ? <Menu /> : <X size={18} />}
        </Button>
      </div>

      <div className="flex flex-col h-[calc(100%-3.5rem)]">
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {projects.map((project) => (
              <Collapsible
                key={project.id}
                open={expandedProjects[project.id]}
                onOpenChange={(open) => setExpandedProjects((prev) => ({ ...prev, [project.id]: open }))}
                className={cn(
                  "rounded-md overflow-hidden",
                  activeProjectId === project.id ? "bg-primary/10" : "hover:bg-muted",
                )}
              >
                <div
                  className={cn("flex items-center justify-between rounded-md px-3 py-2 cursor-pointer group")}
                  onClick={() => onSelectProject(project.id)}
                >
                  <div className="flex items-center overflow-hidden flex-1">
                    <div className="w-8 h-8 rounded bg-muted-foreground/20 flex items-center justify-center mr-2 flex-shrink-0">
                      {project.image ? (
                        <img
                          src={project.image || "/placeholder.svg"}
                          alt={project.name}
                          className="w-full h-full object-cover rounded"
                        />
                      ) : (
                        <span className="text-xs">{project.name.substring(0, 2)}</span>
                      )}
                    </div>
                    {!isCollapsed && <span className="truncate">{project.name}</span>}
                  </div>

                  {!isCollapsed && (
                    <div className="flex items-center">
                      {project.panels && project.panels.length > 0 && (
                        <CollapsibleTrigger asChild onClick={(e) => toggleProjectExpanded(project.id, e)}>
                          <Button variant="ghost" size="icon" className="h-6 w-6 mr-1">
                            {expandedProjects[project.id] ? <ChevronDown size={14} /> : <ChevronRight size={14} />}
                          </Button>
                        </CollapsibleTrigger>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        className="opacity-0 group-hover:opacity-100 h-6 w-6"
                        onClick={(e) => {
                          e.stopPropagation()
                          onDeleteProject(project.id)
                        }}
                      >
                        <Trash2 size={14} />
                      </Button>
                    </div>
                  )}
                </div>

                {!isCollapsed && project.panels && project.panels.length > 0 && (
                  <CollapsibleContent>
                    <div className="pl-10 pr-3 pb-2 space-y-1">
                      <div className="text-xs font-medium text-muted-foreground mb-1">Panels</div>
                      <div className="grid grid-cols-3 gap-1">
                        {project.panels.map((panel, index) => (
                          <div key={index} className="relative aspect-square rounded overflow-hidden border">
                            <img
                              src={panel || "/placeholder.svg"}
                              alt={`Panel ${index + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  </CollapsibleContent>
                )}
              </Collapsible>
            ))}
          </div>
        </ScrollArea>

        <div className="p-2 border-t">
          <Button
            variant="outline"
            className={cn("w-full justify-start", isCollapsed && "justify-center px-0")}
            onClick={onAddProject}
          >
            <PlusCircle size={16} className={cn("mr-2", isCollapsed && "mr-0")} />
            {!isCollapsed && "New Project"}
          </Button>
        </div>
      </div>
    </div>
  )
}
