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

// Consolidated AnalysisResult
export interface AnalysisResult {
  videoId?: string;
  segments: {
    id: string;
    sourceVideoId?: string;
    start: number;
    end: number;
    energy: number;
    keywords: string[];
    speakerId?: string;
    silenceBefore?: number;
  }[];
  timeline?: {
    energy: number[];
    silence: number[];
  };
  // Legacy fields for compatibility if needed
  audioEnergyTimeline?: number[];
  detectedKeywords?: string[];
  speakers?: {
    id: string;
    segments: { start: number; end: number }[];
  }[];
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
  // TemplateEngine specific fields
  segmentId?: string;
  rule?: string;
  outcome?: string; // e.g., "kept", "discarded", "split", "boosted"
  scoreChange?: number;
};

export interface ScoredSegment extends Segment {
  // Calculated quality score (0-100) based on content analysis
  score: number;
  // Decision trace explaining the score
  explain: DecisionTrace;
}

// --- Template Engine Types ---

export interface TemplateRules {
  minSegmentDuration?: number;
  maxSegmentDuration?: number;
  targetDuration?: number;
  minEnergy?: number;
  keywordsBoost?: number;
  silencePenalty?: number;
  transitions?: {
    type: string;
    duration: number;
  };
}

export interface TemplateStyle {
  transitions?: string; // e.g., 'crossfade'
  caption?: boolean;
  zoomOnEmphasis?: boolean;
}

export interface TemplateBranding {
  intro?: string;
  watermark?: string;
  music?: string;
  outro?: string;
}

export interface TemplateConfig {
  name: string;
  id?: string;
  rules: TemplateRules;
  scoring?: {
    keywordBoost: number;
    silencePenalty: number;
  };
  style: TemplateStyle;
  branding: TemplateBranding;
}

export interface Asset {
  type: 'video' | 'audio' | 'image';
  src: string; // The R2 key or URL or local path
}

export type AssetMap = Record<string, Asset>;

/**
 * EditPlan: The renderer-agnostic contract describing the desired output.
 * Canonical definition.
 */
export interface EditPlan {
  // Ordered list of clips to sequence
  clips: {
    sourceId: string;
    start: number; // Source start time (seconds)
    end: number;   // Source end time (seconds)
    volume: number; // Normalized volume (0.0 - 1.0)
    zoom?: boolean; // Intent: "Apply a zoom effect for emphasis"
  }[];

  // Transitions between clips
  transitions: {
    type: 'fade' | 'cut' | 'wipe' | 'crossfade';
    duration: number;
    atTime: number;   // Output timeline position (seconds)
  }[];

  // Metadata for the renderer
  metadata: {
    totalDuration: number;
    fps: number;
    resolution: { width: number; height: number };
  };

  // Branding elements
  branding?: {
    intro?: string;
    outro?: string;
    watermark?: string;
    music?: string;
  };

  captions?: boolean;

  // Explainability trace
  decisionTrace?: DecisionTrace[];

  // Asset Map for resolving external resources
  assetMap?: AssetMap;

  // Debug mode
  debug?: boolean;
}
