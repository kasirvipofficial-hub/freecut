import { apiClient } from '@/api/client';
import type { Project, ProjectFormData } from '@/types/project';

export class ProjectsAPI {
  private baseUrl = '/projects';

  async getAll(): Promise<Project[]> {
    return apiClient.get<Project[]>(this.baseUrl);
  }

  async getById(id: string): Promise<Project | null> {
    try {
      return await apiClient.get<Project>(`${this.baseUrl}/${id}`);
    } catch (error) {
      // Return null if project not found
      return null;
    }
  }

  async create(data: ProjectFormData): Promise<Project> {
    return apiClient.post<Project>(this.baseUrl, data);
  }

  async update(id: string, data: Partial<ProjectFormData>): Promise<Project> {
    return apiClient.put<Project>(`${this.baseUrl}/${id}`, data);
  }

  async delete(id: string): Promise<void> {
    await apiClient.delete(`${this.baseUrl}/${id}`);
  }
}

export const projectsAPI = new ProjectsAPI();
