import type { ExportSettings } from '@/types/export';

export interface ExportState {
  isExporting: boolean;
  progress: number;
  error: string | null;
  exportUrl: string | null;
}

export interface ExportActions {
  startExport: (settings: ExportSettings) => Promise<void>;
  cancelExport: () => void;
  resetExport: () => void;
}

export interface RenderProgress {
  renderedFrames: number;
  totalFrames: number;
  percentage: number;
  timeRemaining: number;
}
