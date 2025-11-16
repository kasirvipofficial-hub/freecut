import { create } from 'zustand';
import type { SelectionState, SelectionActions } from '../types';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const selectedClipIds = useSelectionStore(s => s.selectedClipIds);
// const selectClips = useSelectionStore(s => s.selectClips);
//
// ❌ WRONG: Don't destructure the entire store
// const { selectedClipIds, selectClips } = useSelectionStore();

export const useSelectionStore = create<SelectionState & SelectionActions>((set) => ({
  // State
  selectedClipIds: [],
  selectedTrackId: null,
  selectionType: null,

  // Actions
  selectClips: (ids) => set({
    selectedClipIds: ids,
    selectedTrackId: null,
    selectionType: ids.length > 0 ? 'clip' : null,
  }),
  selectTrack: (id) => set({
    selectedTrackId: id,
    selectedClipIds: [],
    selectionType: id ? 'track' : null,
  }),
  clearSelection: () => set({
    selectedClipIds: [],
    selectedTrackId: null,
    selectionType: null,
  }),
}));
