export interface MediaMetadata {
  id: string;
  opfsPath: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  duration: number;
  width: number;
  height: number;
  fps: number;
  codec: string;
  bitrate: number;
  thumbnailId?: string;
  tags: string[];
  createdAt: number;
  updatedAt: number;
}

export interface ProjectMetadata {
  id: string;
  name: string;
  description: string;
  duration: number;
  resolution: { width: number; height: number };
  fps: number;
  createdAt: number;
  updatedAt: number;
}

export interface ThumbnailData {
  id: string;
  mediaId: string;
  blob: Blob;
  timestamp: number;
  width: number;
  height: number;
}
