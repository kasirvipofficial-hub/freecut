export interface Signal {
  id: string;
  type: 'video' | 'audio';
  duration: number; // in seconds
  metadata: {
    format?: string;
    resolution?: { width: number; height: number };
    sampleRate?: number;
    fps?: number;
    filename: string;
    [key: string]: unknown;
  };
}

export interface Segment {
  id: string;
  signalId: string;
  startTime: number; // in seconds
  endTime: number; // in seconds
  type: 'speech' | 'silence' | 'visual_interest';
  features?: {
    audioLevel?: number;
    wordCount?: number;
    visualActivity?: number;
    [key: string]: unknown;
  };
}

export interface ScoredSegment extends Segment {
  score: number; // 0.0 to 1.0
  reason?: string;
}

export interface EditPlanClip {
  id: string;
  sourceId: string;
  sourceStartTime: number;
  sourceEndTime: number;
  targetStartTime: number; // output timeline start
  duration: number;
}

export interface EditPlan {
  projectId: string;
  totalDuration: number;
  clips: EditPlanClip[];
  generatedAt: string; // ISO date
  metadata?: {
    resolution: { width: number; height: number };
    fps: number;
  };
}

export interface ProcessingOptions {
  minSegmentDuration?: number;
  targetDuration?: number;
  silenceThreshold?: number;
}
