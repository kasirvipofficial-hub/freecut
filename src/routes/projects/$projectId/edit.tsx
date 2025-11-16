import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId/edit')({
  component: EditProject,
  loader: async ({ params }) => {
    // TODO: Load project for editing
    return { project: null };
  },
});

function EditProject() {
  // TODO: Implement edit project page
  return null;
}
