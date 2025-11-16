import { create } from 'zustand';
import type { PlaybackState, PlaybackActions } from '../types';

export const usePlaybackStore = create<PlaybackState & PlaybackActions>((set) => ({
  // State
  currentFrame: 0,
  isPlaying: false,
  playbackRate: 1,
  loop: false,
  volume: 1,
  muted: false,

  // Actions
  setCurrentFrame: (frame) => set({ currentFrame: frame }),
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  togglePlayPause: () => set((state) => ({ isPlaying: !state.isPlaying })),
  setPlaybackRate: (rate) => set({ playbackRate: rate }),
  toggleLoop: () => set((state) => ({ loop: !state.loop })),
  setVolume: (volume) => set({ volume }),
  toggleMute: () => set((state) => ({ muted: !state.muted })),
}));
