import { create } from 'zustand';
import type { SelectionState, SelectionActions } from '../types';

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
