import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/$projectId/editor')({
  component: EditorPage,
  loader: async ({ params }) => {
    // TODO: Load project data for editor
    return { project: null };
  },
});

function EditorPage() {
  // TODO: Implement editor page with Editor component
  return null;
}
