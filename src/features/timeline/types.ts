import type { TimelineTrack, TimelineClip } from '@/types/timeline';

export interface TimelineState {
  tracks: TimelineTrack[];
  clips: TimelineClip[];
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
  setTracks: (tracks: TimelineTrack[]) => void;
  addClip: (clip: TimelineClip) => void;
  updateClip: (id: string, updates: Partial<TimelineClip>) => void;
  removeClips: (ids: string[]) => void;
  setCurrentFrame: (frame: number) => void;
  play: () => void;
  pause: () => void;
  setZoom: (level: number) => void;
  toggleSnap: () => void;
  selectItems: (ids: string[]) => void;
}
