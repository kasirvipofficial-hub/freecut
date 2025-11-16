import { create } from 'zustand';
import { temporal } from 'zundo';
import type { TimelineState, TimelineActions } from '../types';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const currentFrame = useTimelineStore(s => s.currentFrame);
// const setCurrentFrame = useTimelineStore(s => s.setCurrentFrame);
//
// ❌ WRONG: Don't destructure the entire store
// const { currentFrame, setCurrentFrame } = useTimelineStore();
//
// UNDO/REDO: This store is wrapped with Zundo's temporal middleware
// Access undo/redo functionality:
// const undo = useTimelineStore.temporal.getState().undo;
// const redo = useTimelineStore.temporal.getState().redo;
// const canUndo = useTimelineStore((state) => state.pastStates.length > 0);

export const useTimelineStore = create<TimelineState & TimelineActions>()(
  temporal((set) => ({
  // State
  tracks: [],
  clips: [],
  currentFrame: 0,
  isPlaying: false,
  fps: 30,
  zoomLevel: 1,
  scrollPosition: 0,
  snapEnabled: true,
  selectedItemIds: [],
  selectedTrackId: null,

  // Actions
  setTracks: (tracks) => set({ tracks }),
  addClip: (clip) => set((state) => ({ clips: [...state.clips, clip] })),
  updateClip: (id, updates) => set((state) => ({
    clips: state.clips.map((c) => (c.id === id ? { ...c, ...updates } : c)),
  })),
  removeClips: (ids) => set((state) => ({
    clips: state.clips.filter((c) => !ids.includes(c.id)),
  })),
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  setZoom: (level) => set({ zoomLevel: level }),
  toggleSnap: () => set((state) => ({ snapEnabled: !state.snapEnabled })),
  selectItems: (ids) => set({ selectedItemIds: ids }),
  }))
);
