# CRUD Patterns for Project Management

Patterns for Create, Read, Update, Delete operations with Zustand, TanStack Router, and external API.

## Overview

Video editor project management with:
- **Zustand** - Client-side state management
- **TanStack Router** - Type-safe routing and data loaders
- **API Client** - HTTP requests to separate backend
- **Shadcn** - Form components and validation
- **Zod** - Schema validation

## Architecture

```
User Action → Route Loader/Component → API Client → Backend
                ↓
            Zustand Store (local state cache)
                ↓
            UI Components (auto re-render)
```

## Project Data Model

```typescript
// src/types/project.ts
export interface Project {
  id: string
  name: string
  description: string
  createdAt: string
  updatedAt: string
  duration: number // seconds
  thumbnailUrl?: string
  metadata: {
    width: number
    height: number
    fps: number
  }
}

export interface ProjectFormData {
  name: string
  description: string
  metadata: {
    width: number
    height: number
    fps: number
  }
}
```

## API Client Setup

### Base API Client

```typescript
// src/api/client.ts
import axios from 'axios'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
})

// Request interceptor (add auth token, etc.)
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken')
  if (token) {
    config.headers.Authorization = `Bearer ${token}`
  }
  return config
})

// Response interceptor (error handling)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Handle unauthorized
      window.location.href = '/login'
    }
    return Promise.reject(error)
  }
)
```

### Projects API

```typescript
// src/api/projects.ts
import { apiClient } from './client'
import type { Project, ProjectFormData } from '@/types/project'

export const projectsApi = {
  // List projects
  async getProjects(params?: { page?: number; search?: string; sortBy?: string }) {
    const { data } = await apiClient.get<{ projects: Project[]; total: number }>('/projects', {
      params,
    })
    return data
  },

  // Get single project
  async getProject(id: string) {
    const { data } = await apiClient.get<Project>(`/projects/${id}`)
    return data
  },

  // Create project
  async createProject(formData: ProjectFormData) {
    const { data } = await apiClient.post<Project>('/projects', formData)
    return data
  },

  // Update project
  async updateProject(id: string, formData: Partial<ProjectFormData>) {
    const { data } = await apiClient.patch<Project>(`/projects/${id}`, formData)
    return data
  },

  // Delete project
  async deleteProject(id: string) {
    await apiClient.delete(`/projects/${id}`)
  },
}
```

## Zustand Store

```typescript
// src/stores/project-store.ts
import { create } from 'zustand'
import { devtools } from 'zustand/middleware'
import type { Project } from '@/types/project'

interface ProjectState {
  // State
  projects: Project[]
  currentProject: Project | null
  isLoading: boolean
  error: string | null

  // Actions
  setProjects: (projects: Project[]) => void
  setCurrentProject: (project: Project | null) => void
  addProject: (project: Project) => void
  updateProject: (id: string, updates: Partial<Project>) => void
  removeProject: (id: string) => void
  setLoading: (isLoading: boolean) => void
  setError: (error: string | null) => void
  reset: () => void
}

const initialState = {
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,
}

export const useProjectStore = create<ProjectState>()(
  devtools(
    (set) => ({
      ...initialState,

      setProjects: (projects) => set({ projects }),

      setCurrentProject: (project) => set({ currentProject: project }),

      addProject: (project) =>
        set((state) => ({
          projects: [project, ...state.projects],
        })),

      updateProject: (id, updates) =>
        set((state) => ({
          projects: state.projects.map((p) => (p.id === id ? { ...p, ...updates } : p)),
          currentProject:
            state.currentProject?.id === id
              ? { ...state.currentProject, ...updates }
              : state.currentProject,
        })),

      removeProject: (id) =>
        set((state) => ({
          projects: state.projects.filter((p) => p.id !== id),
          currentProject: state.currentProject?.id === id ? null : state.currentProject,
        })),

      setLoading: (isLoading) => set({ isLoading }),

      setError: (error) => set({ error }),

      reset: () => set(initialState),
    }),
    { name: 'ProjectStore' }
  )
)
```

## CRUD Implementation

### 1. List Projects

```typescript
// src/routes/projects/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { projectsApi } from '@/api/projects'
import { useProjectStore } from '@/stores/project-store'
import { ProjectCard } from '@/components/projects/project-card'
import { z } from 'zod'

const projectsSearchSchema = z.object({
  page: z.number().optional().default(1),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'date', 'duration']).optional().default('date'),
})

export const Route = createFileRoute('/projects')({
  validateSearch: projectsSearchSchema,
  loader: async ({ search }) => {
    const data = await projectsApi.getProjects(search)
    useProjectStore.getState().setProjects(data.projects)
    return data
  },
  component: ProjectsList,
})

function ProjectsList() {
  const { page, search, sortBy } = Route.useSearch()
  const projects = useProjectStore((s) => s.projects) // Granular selector!

  return (
    <div>
      <h1>My Projects</h1>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {projects.map((project) => (
          <ProjectCard key={project.id} project={project} />
        ))}
      </div>
    </div>
  )
}
```

### 2. Create Project

```typescript
// src/routes/projects/new.tsx
import { createFileRoute, useNavigate } from '@tanstack/react-router'
import { projectsApi } from '@/api/projects'
import { useProjectStore } from '@/stores/project-store'
import { ProjectForm } from '@/components/projects/project-form'
import type { ProjectFormData } from '@/types/project'

export const Route = createFileRoute('/projects/new')({
  component: CreateProject,
})

function CreateProject() {
  const navigate = useNavigate()
  const addProject = useProjectStore((s) => s.addProject)
  const setError = useProjectStore((s) => s.setError)

  const handleSubmit = async (formData: ProjectFormData) => {
    try {
      const project = await projectsApi.createProject(formData)
      addProject(project) // Update local cache

      // Navigate to editor
      navigate({
        to: '/projects/$projectId/editor',
        params: { projectId: project.id },
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to create project')
    }
  }

  return (
    <div>
      <h1>Create New Project</h1>
      <ProjectForm onSubmit={handleSubmit} />
    </div>
  )
}
```

### 3. Read Project (Detail)

```typescript
// src/routes/projects/$projectId/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { projectsApi } from '@/api/projects'
import { useProjectStore } from '@/stores/project-store'

export const Route = createFileRoute('/projects/$projectId')({
  loader: async ({ params }) => {
    const project = await projectsApi.getProject(params.projectId)
    useProjectStore.getState().setCurrentProject(project)
    return { project }
  },
  component: ProjectDetail,
})

function ProjectDetail() {
  const { projectId } = Route.useParams()
  const currentProject = useProjectStore((s) => s.currentProject)

  if (!currentProject) return <div>Loading...</div>

  return (
    <div>
      <h1>{currentProject.name}</h1>
      <p>{currentProject.description}</p>
      <img src={currentProject.thumbnailUrl} alt={currentProject.name} />
      <p>Duration: {currentProject.duration}s</p>
      <p>Size: {currentProject.metadata.width}x{currentProject.metadata.height}</p>
      <p>FPS: {currentProject.metadata.fps}</p>
    </div>
  )
}
```

### 4. Update Project

```typescript
// src/routes/projects/$projectId/edit.tsx
import { createFileRoute, useNavigate } from '@tantml:react-router'
import { projectsApi } from '@/api/projects'
import { useProjectStore } from '@/stores/project-store'
import { ProjectForm } from '@/components/projects/project-form'
import type { ProjectFormData } from '@/types/project'

export const Route = createFileRoute('/projects/$projectId/edit')({
  loader: async ({ params }) => {
    const project = await projectsApi.getProject(params.projectId)
    useProjectStore.getState().setCurrentProject(project)
    return { project }
  },
  component: EditProject,
})

function EditProject() {
  const { projectId } = Route.useParams()
  const { project } = Route.useLoaderData()
  const navigate = useNavigate()
  const updateProject = useProjectStore((s) => s.updateProject)
  const setError = useProjectStore((s) => s.setError)

  const handleSubmit = async (formData: ProjectFormData) => {
    try {
      const updated = await projectsApi.updateProject(projectId, formData)
      updateProject(projectId, updated) // Update local cache

      // Navigate back to detail
      navigate({
        to: '/projects/$projectId',
        params: { projectId },
      })
    } catch (error) {
      setError(error instanceof Error ? error.message : 'Failed to update project')
    }
  }

  return (
    <div>
      <h1>Edit Project</h1>
      <ProjectForm initialData={project} onSubmit={handleSubmit} />
    </div>
  )
}
```

### 5. Delete Project

```typescript
// src/components/projects/project-card.tsx
import { useNavigate } from '@tanstack/react-router'
import { projectsApi } from '@/api/projects'
import { useProjectStore } from '@/stores/project-store'
import { Button } from '@/components/ui/button'
import { AlertDialog } from '@/components/ui/alert-dialog'
import type { Project } from '@/types/project'

export function ProjectCard({ project }: { project: Project }) {
  const navigate = useNavigate()
  const removeProject = useProjectStore((s) => s.removeProject)
  const [isDeleting, setIsDeleting] = useState(false)

  const handleDelete = async () => {
    try {
      setIsDeleting(true)
      await projectsApi.deleteProject(project.id)
      removeProject(project.id) // Update local cache
    } catch (error) {
      console.error('Failed to delete project', error)
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="border rounded-lg p-4">
      <img src={project.thumbnailUrl} alt={project.name} className="w-full h-40 object-cover" />
      <h3 className="text-lg font-semibold mt-2">{project.name}</h3>
      <p className="text-sm text-muted-foreground">{project.description}</p>

      <div className="flex gap-2 mt-4">
        <Button
          onClick={() =>
            navigate({ to: '/projects/$projectId/editor', params: { projectId: project.id } })
          }
        >
          Edit
        </Button>

        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="destructive" disabled={isDeleting}>
              Delete
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Project?</AlertDialogTitle>
              <AlertDialogDescription>
                This action cannot be undone. This will permanently delete your project.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction onClick={handleDelete}>Delete</AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>
    </div>
  )
}
```

## Form Component with Validation

```typescript
// src/components/projects/project-form.tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form'
import type { Project, ProjectFormData } from '@/types/project'

const projectFormSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100, 'Name too long'),
  description: z.string().max(500, 'Description too long'),
  metadata: z.object({
    width: z.number().min(1).max(7680),
    height: z.number().min(1).max(4320),
    fps: z.number().min(1).max(120),
  }),
})

interface ProjectFormProps {
  initialData?: Project
  onSubmit: (data: ProjectFormData) => Promise<void>
}

export function ProjectForm({ initialData, onSubmit }: ProjectFormProps) {
  const form = useForm<ProjectFormData>({
    resolver: zodResolver(projectFormSchema),
    defaultValues: initialData || {
      name: '',
      description: '',
      metadata: {
        width: 1920,
        height: 1080,
        fps: 30,
      },
    },
  })

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Project Name</FormLabel>
              <FormControl>
                <Input placeholder="My awesome video" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Description</FormLabel>
              <FormControl>
                <Textarea placeholder="Describe your project..." {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="grid grid-cols-3 gap-4">
          <FormField
            control={form.control}
            name="metadata.width"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Width</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(+e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="metadata.height"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Height</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(+e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="metadata.fps"
            render={({ field }) => (
              <FormItem>
                <FormLabel>FPS</FormLabel>
                <FormControl>
                  <Input type="number" {...field} onChange={(e) => field.onChange(+e.target.value)} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <Button type="submit" disabled={form.formState.isSubmitting}>
          {form.formState.isSubmitting ? 'Saving...' : initialData ? 'Update' : 'Create'}
        </Button>
      </form>
    </Form>
  )
}
```

## Error Handling

### Global Error Boundary

```typescript
// src/components/error-boundary.tsx
import { Component, type ReactNode } from 'react'

interface Props {
  children: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="p-8 text-center">
          <h1 className="text-2xl font-bold text-red-500">Something went wrong</h1>
          <p className="mt-2">{this.state.error?.message}</p>
          <button onClick={() => window.location.reload()} className="mt-4 btn">
            Reload Page
          </button>
        </div>
      )
    }

    return this.props.children
  }
}
```

### API Error Handling

```typescript
// src/hooks/use-api-error.ts
import { useProjectStore } from '@/stores/project-store'

export function useApiError() {
  const setError = useProjectStore((s) => s.setError)

  return (error: unknown) => {
    if (error instanceof Error) {
      setError(error.message)
    } else if (typeof error === 'string') {
      setError(error)
    } else {
      setError('An unknown error occurred')
    }
  }
}
```

## Loading States

```typescript
// src/components/projects/projects-list.tsx
import { Skeleton } from '@/components/ui/skeleton'

function ProjectsList() {
  const { projects } = Route.useLoaderData()
  const isLoading = useProjectStore((s) => s.isLoading)

  if (isLoading) {
    return (
      <div className="grid grid-cols-3 gap-4">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <Skeleton key={i} className="h-64" />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-3 gap-4">
      {projects.map((project) => (
        <ProjectCard key={project.id} project={project} />
      ))}
    </div>
  )
}
```

## Best Practices

1. **Always use granular Zustand selectors** - `useProjectStore(s => s.projects)` not `useProjectStore()`
2. **Use TanStack Router loaders** - Fetch data before rendering, not in useEffect
3. **Update Zustand after API calls** - Keep local cache in sync
4. **Validate with Zod** - Type-safe validation for forms and API responses
5. **Handle errors gracefully** - Show user-friendly error messages
6. **Optimistic updates** - Update UI immediately, rollback on error
7. **Loading states** - Show skeletons/spinners during async operations
8. **Type everything** - Leverage TypeScript for API responses and forms

## Optimistic Updates (Advanced)

```typescript
const handleDelete = async (projectId: string) => {
  // Optimistically remove from UI
  const previousProjects = useProjectStore.getState().projects
  removeProject(projectId)

  try {
    await projectsApi.deleteProject(projectId)
  } catch (error) {
    // Rollback on error
    useProjectStore.setState({ projects: previousProjects })
    setError('Failed to delete project')
  }
}
```

## Testing

```typescript
// src/api/__tests__/projects.test.ts
import { describe, it, expect, vi } from 'vitest'
import { projectsApi } from '../projects'
import { apiClient } from '../client'

vi.mock('../client')

describe('projectsApi', () => {
  it('should get projects', async () => {
    const mockProjects = [{ id: '1', name: 'Test' }]
    vi.mocked(apiClient.get).mockResolvedValue({ data: { projects: mockProjects, total: 1 } })

    const result = await projectsApi.getProjects()

    expect(result.projects).toEqual(mockProjects)
    expect(apiClient.get).toHaveBeenCalledWith('/projects', { params: undefined })
  })
})
```

## See Also

- `routing.md` - TanStack Router patterns
- `state-management.md` - Zustand best practices
- `error-handling.md` - Error recovery strategies
