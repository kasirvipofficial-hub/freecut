export interface VideoInput {
  // Path to the video file (could be local or remote URL)
  filePath: string;
  // Unique identifier for the video asset
  id: string;
}

export interface UserConfig {
  // Desired duration of the output video in seconds
  targetDuration: number;
  // Minimum duration for any single segment in seconds
  minSegmentDuration: number;
  // Maximum duration for any single segment in seconds
  maxSegmentDuration: number;
  // Keywords to prioritize when scoring content
  keywords: string[];
  // Tone/mood preference which might influence pacing or music choice (e.g., "energetic", "calm")
  mood: 'energetic' | 'calm' | 'neutral';
}

export interface AudioSignals {
  // Array of timestamps where significant audio events occur (e.g., start of speech)
  timestamps: number[];
  // Corresponding energy levels for each timestamp (normalized 0-1)
  energy: number[];
  // Transcription of the audio, if available
  transcription?: {
    text: string;
    startTime: number;
    endTime: number;
  }[];
}

export interface VideoSignals {
  // Array of timestamps for scene changes
  sceneChanges: number[];
  // Metadata about visual content (e.g., "talking_head", "screen_recording")
  visualType: string[];
}

export interface SignalData {
  audio: AudioSignals;
  video: VideoSignals;
  duration: number; // Total duration of the source video
}

export interface NormalizedTimeline {
  // Unified timeline with aligned audio/video data points
  timePoints: {
    time: number;
    audioEnergy: number;
    isSpeech: boolean;
    isSceneChange: boolean;
  }[];
  totalDuration: number;
}

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  // Source video ID this segment comes from
  sourceVideoId: string;
}

export interface ScoredSegment extends Segment {
  // Calculated quality score (0-100) based on content analysis
  score: number;
  // Breakdown of how the score was calculated
  scoreDetails: {
    wordDensity: number;
    energyLevel: number;
    keywordMatch: number;
    penalty: number;
  };
}

// Action Types for Rendering (Agnostic)
export interface VideoAction {
  type: 'zoom_in' | 'fade_in' | 'fade_out' | 'opacity';
  params?: {
    duration?: number;
    value?: number; // e.g., opacity value (0-1)
    scale?: number; // e.g., zoom scale (1.0-2.0)
  };
}

export interface AudioAction {
  type: 'normalize' | 'fade_in' | 'fade_out' | 'ducking';
  params?: {
    duration?: number;
    volume?: number; // Target volume
    duckingAmount?: number; // Reduction amount
  };
}

export interface TextAction {
  type: 'caption' | 'lower_third';
  text: string;
  params?: {
    position?: 'top' | 'bottom' | 'center';
    color?: string;
    fontSize?: number;
  };
}

export type BrandingOptions = {
  intro?: {
    assetId: string;
    duration?: number;
  };
  outro?: {
    assetId: string;
    duration?: number;
  };
  watermark?: {
    assetId: string;
    position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';
    opacity?: number;
  };
  backgroundMusic?: {
    assetId: string;
    loop: boolean;
    volume: number;
  };
};

export interface EditPlanClip {
  sourceId: string;
  start: number;
  end: number;
  volume: number;
  videoActions?: VideoAction[];
  audioActions?: AudioAction[];
  textActions?: TextAction[];
}

export interface EditPlan {
  // List of final clips to include in the render
  clips: EditPlanClip[];
  // Transitions between clips
  transitions: {
    type: 'fade' | 'cut' | 'wipe';
    duration: number;
    atTime: number; // Time in the output timeline
  }[];
  // Metadata for the renderer
  metadata: {
    totalDuration: number;
    fps: number;
    resolution: { width: number; height: number };
  };
  branding?: BrandingOptions;
}

export type AssetMap = {
  sourceVideo: string;
  sourceAudio?: string;
  intro?: string;
  outro?: string;
  watermark?: string;
  music?: string;
  fonts?: Record<string, string>;
  // Allow accessing by specific asset IDs if needed
  [key: string]: string | Record<string, string> | undefined;
};
