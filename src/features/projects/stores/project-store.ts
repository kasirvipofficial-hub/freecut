import { create } from 'zustand';
import type { ProjectState, ProjectActions } from '../types';

export const useProjectStore = create<ProjectState & ProjectActions>((set) => ({
  // State
  projects: [],
  currentProject: null,
  isLoading: false,
  error: null,

  // Actions
  loadProjects: async () => {
    // TODO: Implement load projects
  },
  loadProject: async (id) => {
    // TODO: Implement load project
  },
  createProject: async (data) => {
    // TODO: Implement create project
    throw new Error('Not implemented');
  },
  updateProject: async (id, data) => {
    // TODO: Implement update project
  },
  deleteProject: async (id) => {
    // TODO: Implement delete project
  },
  setCurrentProject: (project) => set({ currentProject: project }),
}));
