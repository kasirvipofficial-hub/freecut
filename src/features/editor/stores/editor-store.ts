import { create } from 'zustand';
import type { EditorState, EditorActions } from '../types';

export const useEditorStore = create<EditorState & EditorActions>((set) => ({
  // State
  activePanel: null,
  sidebarWidth: 300,
  timelineHeight: 250,

  // Actions
  setActivePanel: (panel) => set({ activePanel: panel }),
  setSidebarWidth: (width) => set({ sidebarWidth: width }),
  setTimelineHeight: (height) => set({ timelineHeight: height }),
}));
