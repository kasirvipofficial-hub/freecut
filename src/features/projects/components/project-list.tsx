import type { Project } from '@/types/project';

export interface ProjectListProps {
  projects: Project[];
  onSelect?: (project: Project) => void;
}

export function ProjectList(props: ProjectListProps) {
  // TODO: Implement project list component
  return null;
}
