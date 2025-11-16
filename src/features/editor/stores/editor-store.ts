import { create } from 'zustand';
import type { EditorState, EditorActions } from '../types';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const activePanel = useEditorStore(s => s.activePanel);
// const setActivePanel = useEditorStore(s => s.setActivePanel);
//
// ❌ WRONG: Don't destructure the entire store
// const { activePanel, setActivePanel } = useEditorStore();

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
