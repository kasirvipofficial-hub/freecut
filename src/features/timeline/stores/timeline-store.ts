import { create } from 'zustand';
import type { TimelineState, TimelineActions } from '../types';

export const useTimelineStore = create<TimelineState & TimelineActions>((set) => ({
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
}));
