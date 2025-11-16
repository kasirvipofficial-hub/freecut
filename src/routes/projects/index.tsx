import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/')({
  component: ProjectsIndex,
  loader: async () => {
    // TODO: Load projects
    return { projects: [] };
  },
});

function ProjectsIndex() {
  // TODO: Implement projects list page
  return null;
}
