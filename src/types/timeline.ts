export interface TimelineTrack {
  id: string;
  name: string;
  type: 'video' | 'audio' | 'subtitle';
  height: number;
  locked: boolean;
  muted: boolean;
  solo: boolean;
  color: string;
  order: number;
  clips: TimelineClip[];
}

export interface TimelineClip {
  id: string;
  trackId: string;
  start: number;
  end: number;
  duration: number;
  offset: number;
  label: string;
  color: string;
  mediaId: string;
  type: 'video' | 'audio' | 'image';
  thumbnailUrl?: string;
  waveformData?: number[];
}

export interface Gap {
  start: number;
  end: number;
  duration: number;
}

export interface SnapTarget {
  id: string;
  time: number;
  type: 'clip-start' | 'clip-end' | 'playhead' | 'marker';
  label?: string;
}

export interface Marker {
  time: number;
  position: number;
  label: string;
  major: boolean;
}
