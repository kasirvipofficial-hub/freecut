import type { Project, ProjectFormData } from '@/types/project';

export class ProjectsAPI {
  private baseUrl = '/api/projects';

  async getAll(): Promise<Project[]> {
    // TODO: Implement get all projects
    return [];
  }

  async getById(id: string): Promise<Project | null> {
    // TODO: Implement get project by id
    return null;
  }

  async create(data: ProjectFormData): Promise<Project> {
    // TODO: Implement create project
    throw new Error('Not implemented');
  }

  async update(id: string, data: Partial<ProjectFormData>): Promise<Project> {
    // TODO: Implement update project
    throw new Error('Not implemented');
  }

  async delete(id: string): Promise<void> {
    // TODO: Implement delete project
  }
}

export const projectsAPI = new ProjectsAPI();
