import { createFileRoute, Link } from '@tanstack/react-router';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { MoreVertical, Play, Trash2, FolderOpen } from 'lucide-react';

export const Route = createFileRoute('/projects/')({
  component: ProjectsIndex,
  loader: async () => {
    // TODO: Load projects from API/store
    return { projects: [] };
  },
});

function ProjectsIndex() {
  const { projects } = Route.useLoaderData();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="panel-header border-b border-border">
        <div className="max-w-[1920px] mx-auto px-6 py-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground mb-1">
              Projects
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your video editing projects
            </p>
          </div>
          <Link to="/projects/new">
            <Button size="lg" className="gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              New Project
            </Button>
          </Link>
        </div>
      </div>

      {/* Projects Grid */}
      <div className="max-w-[1920px] mx-auto px-6 py-8">
        {projects.length === 0 ? (
          /* Empty state */
          <div className="flex flex-col items-center justify-center py-32">
            <div className="w-20 h-20 rounded-xl panel-bg border border-border flex items-center justify-center mb-6">
              <FolderOpen className="w-10 h-10 text-muted-foreground" />
            </div>
            <h3 className="text-xl font-medium text-foreground mb-2">No projects yet</h3>
            <p className="text-muted-foreground text-center max-w-md mb-8">
              Create your first video editing project to get started with the timeline editor.
            </p>
            <Link to="/projects/new">
              <Button size="lg" className="gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
                Create Project
              </Button>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {projects.map((project) => (
              <div
                key={project.id}
                className="group panel-bg border border-border rounded-lg overflow-hidden hover:border-primary/50 transition-all duration-200"
              >
                {/* Thumbnail */}
                <Link
                  to="/projects/$projectId/editor"
                  params={{ projectId: project.id }}
                  className="block"
                >
                  <div className="aspect-video bg-secondary relative overflow-hidden">
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Play className="w-12 h-12 text-muted-foreground group-hover:text-primary transition-colors" />
                    </div>
                    {/* Timeline preview strip */}
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary/30 to-transparent" />
                  </div>
                </Link>

                {/* Info */}
                <div className="p-4">
                  <div className="flex items-start justify-between gap-2 mb-3">
                    <Link
                      to="/projects/$projectId/editor"
                      params={{ projectId: project.id }}
                      className="flex-1 min-w-0"
                    >
                      <h3 className="font-medium text-foreground truncate group-hover:text-primary transition-colors">
                        {project.name}
                      </h3>
                    </Link>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 -mt-1 -mr-2"
                        >
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem>
                          <Play className="w-4 h-4 mr-2" />
                          Open
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <FolderOpen className="w-4 h-4 mr-2" />
                          Duplicate
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem className="text-destructive">
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>

                  {project.description && (
                    <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                      {project.description}
                    </p>
                  )}

                  <div className="flex items-center justify-between text-xs">
                    <span className="font-mono text-muted-foreground">
                      {project.metadata.width}×{project.metadata.height} • {project.metadata.fps}fps
                    </span>
                    <span className="text-muted-foreground">
                      {new Date(project.updatedAt).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
