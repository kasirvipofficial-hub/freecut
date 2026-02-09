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

// --- Template Engine Types ---

export interface AnalysisResult {
  videoId?: string; // Optional top-level ID
  segments: {
    id: string;
    sourceVideoId?: string; // Optional if top-level is set, but good to have
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
}

export interface TemplateRules {
  minEnergy?: number;
  maxSegmentDuration?: number;
  keywordsBoost?: number;
  silencePenalty?: number;
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
  id: string;
  rules: TemplateRules;
  style: TemplateStyle;
  branding: TemplateBranding;
}

/**
 * EditPlan: The renderer-agnostic contract describing the desired output.
 *
 * This structure defines "what" should be rendered, not "how".
 * It is consumed by specific renderers (FFmpeg, Remotion, etc.) which translate
 * these intents into concrete implementation details (pixels, frames, draw commands).
 */
export interface EditPlan {
  // Ordered list of clips to sequence
  clips: {
    sourceId: string;
    start: number; // Source start time (seconds)
    end: number;   // Source end time (seconds)
    volume: number; // Normalized volume (0.0 - 1.0)

    // Semantic visual intents
    zoom?: boolean; // Intent: "Apply a zoom effect for emphasis". Renderer decides scale/easing.
  }[];

  // Transitions between clips
  transitions: {
    type: 'fade' | 'cut' | 'wipe' | 'crossfade'; // Semantic transition types
    duration: number; // Duration in seconds
    atTime: number;   // Output timeline position (seconds)
  }[];

  // Metadata for the renderer
  metadata: {
    totalDuration: number; // Expected total duration in seconds
    fps: number;           // Target frame rate
    resolution: { width: number; height: number }; // Target resolution
  };

  // Branding elements (Resource references only)
  // Renderers determine placement (e.g. watermark top-right) and compositing.
  branding?: {
    intro?: string;     // Path/URL to intro video/image
    outro?: string;     // Path/URL to outro video/image
    watermark?: string; // Path/URL to watermark image
    music?: string;     // Path/URL to background music
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

  // Global caption intent
  // If true, the renderer should generate/overlay captions from transcription data.
  captions?: boolean;

  // Explainability trace (not rendered, but useful for debugging/UI)
  decisionTrace?: {
    segmentId: string;
    rule: string;
    outcome: string; // e.g., "kept", "discarded", "split", "boosted"
    scoreChange?: number;
  }[];
}
