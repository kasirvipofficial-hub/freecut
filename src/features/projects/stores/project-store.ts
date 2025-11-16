import { create } from 'zustand';
import type { ProjectState, ProjectActions } from '../types';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const projects = useProjectStore(s => s.projects);
// const loadProjects = useProjectStore(s => s.loadProjects);
//
// ❌ WRONG: Don't destructure the entire store
// const { projects, loadProjects } = useProjectStore();

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
