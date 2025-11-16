export interface ExportSettings {
  codec: 'h264' | 'h265' | 'vp8' | 'vp9' | 'prores';
  quality: 'low' | 'medium' | 'high' | 'ultra';
  resolution: { width: number; height: number };
  fps: number;
  bitrate?: string;
  audioBitrate?: string;
}

export interface RemotionItem {
  id: string;
  from: number;
  durationInFrames: number;
  offset?: number;
  type: 'video' | 'audio' | 'image';
  src: string;
}

export interface RemotionTrack {
  name: string;
  items: RemotionItem[];
}

export interface RemotionInputProps {
  fps: number;
  tracks: RemotionTrack[];
}
