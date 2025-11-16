import { create } from 'zustand';

export interface ZoomState {
  level: number;
  pixelsPerSecond: number;
}

export interface ZoomActions {
  setZoomLevel: (level: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
}

export const useZoomStore = create<ZoomState & ZoomActions>((set) => ({
  level: 1,
  pixelsPerSecond: 100,

  setZoomLevel: (level) => set({ level, pixelsPerSecond: level * 100 }),
  zoomIn: () => set((state) => ({
    level: Math.min(state.level * 1.2, 10),
    pixelsPerSecond: Math.min(state.level * 1.2, 10) * 100,
  })),
  zoomOut: () => set((state) => ({
    level: Math.max(state.level / 1.2, 0.1),
    pixelsPerSecond: Math.max(state.level / 1.2, 0.1) * 100,
  })),
}));
