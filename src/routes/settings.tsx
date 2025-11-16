import { createFileRoute } from '@tanstack/react-router';

export const Route = createFileRoute('/settings')({
  component: Settings,
});

function Settings() {
  // TODO: Implement settings page
  return null;
}
