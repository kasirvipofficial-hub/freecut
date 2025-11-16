export interface Project {
  id: string;
  name: string;
  description: string;
  createdAt: string;
  updatedAt: string;
  duration: number;
  thumbnailUrl?: string;
  metadata: ProjectResolution;
}

export interface ProjectResolution {
  width: number;
  height: number;
  fps: number;
}

export interface ProjectFormData {
  name: string;
  description: string;
  metadata: ProjectResolution;
}
