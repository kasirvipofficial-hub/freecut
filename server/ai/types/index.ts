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

export interface AnalysisResult {
  audioEnergyTimeline: number[];
  detectedKeywords: string[];
  speakers?: {
    id: string;
    segments: { start: number; end: number }[];
  }[];
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
  // Speaker diarization data
  speakers?: {
    id: string;
    segments: { start: number; end: number }[];
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
  // Metadata derived during normalization
  analysis?: AnalysisResult;
}

export interface Segment {
  id: string;
  startTime: number;
  endTime: number;
  duration: number;
  // Source video ID this segment comes from
  sourceVideoId: string;
}

export type DecisionTrace = {
  reasons: string[];
  weights: Record<string, number>;
  rejectedBecause?: string[];
};

export interface ScoredSegment extends Segment {
  // Calculated quality score (0-100) based on content analysis
  score: number;
  // Decision trace explaining the score
  explain: DecisionTrace;
}

export type EditSegment = {
  id: string;
  start: number;
  end: number;
  score: number;
  actions: {
    video?: string[];
    audio?: string[];
    text?: string[];
    transition?: string;
  };
  explain: DecisionTrace;
};

export interface EditPlan {
  meta: {
    template: string;
    targetDuration: number;
    mood: string;
    fps?: number;
    resolution?: { width: number; height: number };
  };
  segments: EditSegment[];
  branding?: {
    intro?: string;
    outro?: string;
    watermark?: string;
    music?: string;
  };
}
