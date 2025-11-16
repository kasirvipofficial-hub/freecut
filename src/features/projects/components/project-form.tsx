import type { ProjectFormData } from '@/types/project';

export interface ProjectFormProps {
  initialData?: Partial<ProjectFormData>;
  onSubmit: (data: ProjectFormData) => void;
  onCancel?: () => void;
}

export function ProjectForm(props: ProjectFormProps) {
  // TODO: Implement project form component
  return null;
}
