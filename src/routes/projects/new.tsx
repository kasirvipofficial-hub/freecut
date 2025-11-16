import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/projects/new')({
  component: NewProject,
});

function NewProject() {
  // TODO: Implement new project page
  return null;
}
