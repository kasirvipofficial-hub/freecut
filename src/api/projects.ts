import { apiClient } from './client';
import type { Project, ProjectFormData } from '@/types/project';

export async function getAllProjects(): Promise<Project[]> {
  // TODO: Implement get all projects
  return apiClient.get<Project[]>('/projects');
}

export async function getProjectById(id: string): Promise<Project> {
  // TODO: Implement get project by id
  return apiClient.get<Project>(`/projects/${id}`);
}

export async function createProject(data: ProjectFormData): Promise<Project> {
  // TODO: Implement create project
  return apiClient.post<Project>('/projects', data);
}

export async function updateProject(id: string, data: Partial<ProjectFormData>): Promise<Project> {
  // TODO: Implement update project
  return apiClient.put<Project>(`/projects/${id}`, data);
}

export async function deleteProject(id: string): Promise<void> {
  // TODO: Implement delete project
  return apiClient.delete<void>(`/projects/${id}`);
}
