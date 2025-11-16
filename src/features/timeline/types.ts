export interface TimelineState {
  tracks: import('@/types/timeline').TimelineTrack[];
  clips: import('@/types/timeline').TimelineClip[];
  currentFrame: number;
  isPlaying: boolean;
  fps: number;
  zoomLevel: number;
  scrollPosition: number;
  snapEnabled: boolean;
  selectedItemIds: string[];
  selectedTrackId: string | null;
}

export interface TimelineActions {
  setTracks: (tracks: import('@/types/timeline').TimelineTrack[]) => void;
  addClip: (clip: import('@/types/timeline').TimelineClip) => void;
  updateClip: (id: string, updates: Partial<import('@/types/timeline').TimelineClip>) => void;
  removeClips: (ids: string[]) => void;
  setCurrentFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  setZoom: (level: number) => void;
  toggleSnap: () => void;
  selectItems: (ids: string[]) => void;
}
