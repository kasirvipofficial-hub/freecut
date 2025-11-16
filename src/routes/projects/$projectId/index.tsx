import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId/')({
  component: ProjectDetails,
  loader: async ({ params }) => {
    // TODO: Load project by ID
    return { project: null };
  },
});

function ProjectDetails() {
  // TODO: Implement project details page
  return null;
}
