# Routing with TanStack Router

Type-safe client-side routing for the video editor application.

## Overview

**TanStack Router 1.91.6** provides fully type-safe routing with:
- Type-safe route parameters and search params
- Data loaders for fetching before render
- Type-safe navigation
- Code splitting and lazy loading
- Layout routes and nested routing

## Installation

```bash
npm install @tanstack/react-router
npm install -D @tanstack/router-devtools @tanstack/router-plugin
```

## Route Structure

### Option 1: File-based Routing (Recommended)

```
src/routes/
├── __root.tsx              # Root layout
├── index.tsx               # / - Dashboard
├── projects/
│   ├── index.tsx           # /projects - Project list
│   ├── new.tsx             # /projects/new - Create project
│   └── $projectId/
│       ├── index.tsx       # /projects/$projectId - Project detail
│       ├── edit.tsx        # /projects/$projectId/edit - Edit project
│       └── editor.tsx      # /projects/$projectId/editor - Video editor
└── settings.tsx            # /settings
```

### Option 2: Route Tree (Manual)

```typescript
// src/router.tsx
import { createRouter, createRoute, createRootRoute } from '@tanstack/react-router'

const rootRoute = createRootRoute({
  component: RootLayout,
})

const indexRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/',
  component: Dashboard,
})

const projectsRoute = createRoute({
  getParentRoute: () => rootRoute,
  path: '/projects',
  component: ProjectsList,
})

// Define all routes...
const routeTree = rootRoute.addChildren([
  indexRoute,
  projectsRoute,
  // ... more routes
])

export const router = createRouter({ routeTree })
```

## Vite Configuration

Add the TanStack Router plugin to `vite.config.ts`:

```typescript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { TanStackRouterVite } from '@tanstack/router-plugin/vite'

export default defineConfig({
  plugins: [
    TanStackRouterVite(), // Must be before react()
    react(),
  ],
})
```

## Root Layout

```typescript
// src/routes/__root.tsx
import { createRootRoute, Outlet } from '@tanstack/react-router'
import { TanStackRouterDevtools } from '@tanstack/router-devtools'

export const Route = createRootRoute({
  component: () => (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto p-4">
        <Outlet /> {/* Child routes render here */}
      </main>
      <TanStackRouterDevtools position="bottom-right" />
    </div>
  ),
})
```

## Route Examples

### Simple Route (Dashboard)

```typescript
// src/routes/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { Dashboard } from '@/components/dashboard'

export const Route = createFileRoute('/')({
  component: Dashboard,
})
```

### Route with Parameters

```typescript
// src/routes/projects/$projectId/edit.tsx
import { createFileRoute } from '@tanstack/react-router'
import { ProjectEditForm } from '@/components/projects/project-edit-form'

export const Route = createFileRoute('/projects/$projectId/edit')({
  component: ProjectEdit,
})

function ProjectEdit() {
  const { projectId } = Route.useParams() // Fully typed!

  return <ProjectEditForm projectId={projectId} />
}
```

### Route with Loader (Data Fetching)

```typescript
// src/routes/projects/$projectId/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { projectsApi } from '@/api/projects'
import { useProjectStore } from '@/stores/project-store'

export const Route = createFileRoute('/projects/$projectId')({
  loader: async ({ params }) => {
    // Fetch data before rendering
    const project = await projectsApi.getProject(params.projectId)
    return { project }
  },
  component: ProjectDetail,
})

function ProjectDetail() {
  const { projectId } = Route.useParams()
  const { project } = Route.useLoaderData() // Fully typed!

  return (
    <div>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
    </div>
  )
}
```

### Route with Search Params

```typescript
// src/routes/projects/index.tsx
import { createFileRoute } from '@tanstack/react-router'
import { z } from 'zod'

const projectsSearchSchema = z.object({
  page: z.number().optional().default(1),
  search: z.string().optional(),
  sortBy: z.enum(['name', 'date', 'duration']).optional().default('date'),
})

export const Route = createFileRoute('/projects')({
  validateSearch: projectsSearchSchema,
  component: ProjectsList,
})

function ProjectsList() {
  const { page, search, sortBy } = Route.useSearch() // Fully typed!

  // Use search params...
}
```

### Lazy Route (Code Splitting)

```typescript
// src/routes/editor/$projectId/index.tsx
import { createFileRoute } from '@tanstack/react-router'

export const Route = createFileRoute('/editor/$projectId')({
  component: () => import('@/pages/editor/video-editor').then(m => m.VideoEditor),
})
```

## Navigation

### Type-Safe Navigation

```typescript
import { useNavigate, Link } from '@tanstack/react-router'

function MyComponent() {
  const navigate = useNavigate()

  const handleClick = () => {
    // Type-safe navigation with params
    navigate({
      to: '/projects/$projectId/edit',
      params: { projectId: '123' },
    })
  }

  return (
    <div>
      {/* Type-safe Link */}
      <Link
        to="/projects/$projectId"
        params={{ projectId: '456' }}
        activeProps={{ className: 'font-bold' }}
      >
        View Project
      </Link>

      <button onClick={handleClick}>Edit Project</button>
    </div>
  )
}
```

### Programmatic Navigation with Search Params

```typescript
navigate({
  to: '/projects',
  search: {
    page: 2,
    search: 'vacation',
    sortBy: 'name',
  },
})
```

## Integration with Zustand

Combine TanStack Router loaders with Zustand stores:

```typescript
// src/routes/projects/$projectId/editor.tsx
import { createFileRoute } from '@tanstack/react-router'
import { useProjectStore } from '@/stores/project-store'
import { projectsApi } from '@/api/projects'

export const Route = createFileRoute('/projects/$projectId/editor')({
  loader: async ({ params }) => {
    const project = await projectsApi.getProject(params.projectId)

    // Pre-populate Zustand store
    useProjectStore.getState().setCurrentProject(project)

    return { project }
  },
  component: VideoEditor,
})
```

## Error Handling

```typescript
export const Route = createFileRoute('/projects/$projectId')({
  loader: async ({ params }) => {
    try {
      const project = await projectsApi.getProject(params.projectId)
      return { project }
    } catch (error) {
      throw new Error('Project not found')
    }
  },
  errorComponent: ({ error }) => (
    <div className="p-4 text-red-500">
      <h2>Error loading project</h2>
      <p>{error.message}</p>
    </div>
  ),
  component: ProjectDetail,
})
```

## Pending States

```typescript
function ProjectsList() {
  const navigate = useNavigate()

  return (
    <div>
      {navigate.isNavigating && <LoadingSpinner />}
      {/* ... */}
    </div>
  )
}
```

## Route Guards / Protected Routes

```typescript
// src/routes/projects/index.tsx
import { createFileRoute, redirect } from '@tanstack/react-router'
import { useAuthStore } from '@/stores/auth-store'

export const Route = createFileRoute('/projects')({
  beforeLoad: async () => {
    const isAuthenticated = useAuthStore.getState().isAuthenticated

    if (!isAuthenticated) {
      throw redirect({ to: '/login' })
    }
  },
  component: ProjectsList,
})
```

## Best Practices

1. **Use File-based Routing** - Easier to maintain, automatic route generation
2. **Type-safe Everything** - Leverage TanStack Router's full type safety
3. **Loaders for Data** - Fetch data before rendering, not in useEffect
4. **Granular Code Splitting** - Lazy load heavy components (VideoEditor)
5. **Search Params Validation** - Use Zod schemas for type-safe search params
6. **Combine with Zustand** - Use loaders to pre-populate stores
7. **Error Boundaries** - Define errorComponent for each route
8. **Pending States** - Show loading indicators during navigation

## Common Patterns

### Dashboard → Projects List → Project Detail → Editor

```typescript
// User flow with type-safe navigation
const navigateToEditor = (projectId: string) => {
  navigate({
    to: '/projects/$projectId/editor',
    params: { projectId },
  })
}
```

### Create Project → Redirect to Editor

```typescript
// src/routes/projects/new.tsx
const handleCreateProject = async (data: ProjectFormData) => {
  const project = await projectsApi.createProject(data)

  navigate({
    to: '/projects/$projectId/editor',
    params: { projectId: project.id },
  })
}
```

## TypeScript Configuration

Ensure `tsconfig.json` includes:

```json
{
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "types": ["@tanstack/react-router"]
  }
}
```

## DevTools

TanStack Router DevTools show:
- Current route and params
- Loader data
- Navigation history
- Route tree visualization

Enable in `__root.tsx` (already shown above).

## External Resources

- [TanStack Router Docs](https://tanstack.com/router/latest)
- [File-based Routing Guide](https://tanstack.com/router/latest/docs/framework/react/guide/file-based-routing)
- [Type Safety](https://tanstack.com/router/latest/docs/framework/react/guide/type-safety)
