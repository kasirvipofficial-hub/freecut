import { create } from 'zustand';
import type { SelectionState, SelectionActions } from '../types';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const selectedItemIds = useSelectionStore(s => s.selectedItemIds);
// const selectItems = useSelectionStore(s => s.selectItems);
//
// ❌ WRONG: Don't destructure the entire store
// const { selectedItemIds, selectItems } = useSelectionStore();

export const useSelectionStore = create<SelectionState & SelectionActions>((set) => ({
  // State
  selectedItemIds: [],
  selectedTrackId: null, // Deprecated
  selectedTrackIds: [],
  activeTrackId: null,
  selectionType: null,
  activeTool: 'select',
  dragState: null,

  // Actions
  selectItems: (ids) => set((state) => ({
    selectedItemIds: ids,
    // Preserve track selection when selecting items
    selectionType: ids.length > 0 ? 'item' : (state.selectedTrackIds.length > 0 ? 'track' : null),
  })),
  selectTrack: (id) => set({
    selectedTrackId: id,
    activeTrackId: id,
    selectedTrackIds: id ? [id] : [],
    selectedItemIds: [],
    selectionType: id ? 'track' : null,
  }),
  selectTracks: (ids, append = false) => set((state) => {
    const newSelectedIds = append
      ? Array.from(new Set([...state.selectedTrackIds, ...ids]))
      : ids;
    return {
      selectedTrackIds: newSelectedIds,
      activeTrackId: ids[0] || null, // First selected becomes active
      selectedTrackId: ids[0] || null, // Deprecated
      selectedItemIds: [],
      selectionType: newSelectedIds.length > 0 ? 'track' : null,
    };
  }),
  setActiveTrack: (id) => set({
    activeTrackId: id,
    selectedTrackId: id, // Deprecated
    selectedTrackIds: id ? [id] : [],
    selectedItemIds: [],
    selectionType: id ? 'track' : null,
  }),
  toggleTrackSelection: (id) => set((state) => {
    const isSelected = state.selectedTrackIds.includes(id);
    const newSelectedIds = isSelected
      ? state.selectedTrackIds.filter(trackId => trackId !== id)
      : [...state.selectedTrackIds, id];

    return {
      selectedTrackIds: newSelectedIds,
      activeTrackId: newSelectedIds[0] || null,
      selectedTrackId: newSelectedIds[0] || null, // Deprecated
      selectedItemIds: [],
      selectionType: newSelectedIds.length > 0 ? 'track' : null,
    };
  }),
  clearSelection: () => set({
    selectedItemIds: [],
    selectedTrackId: null,
    selectedTrackIds: [],
    activeTrackId: null,
    selectionType: null,
  }),
  clearItemSelection: () => set((state) => ({
    selectedItemIds: [],
    selectionType: state.selectedTrackIds.length > 0 ? 'track' : null,
  })),
  setDragState: (dragState) => set({ dragState }),
  setActiveTool: (tool) => set({ activeTool: tool }),
}));
