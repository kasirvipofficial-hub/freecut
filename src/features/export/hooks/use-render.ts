import type { ExportSettings } from '@/types/export';

export function useRender() {
  // TODO: Implement render hook
  return {
    isExporting: false,
    progress: 0,
    error: null,
    startExport: async (settings: ExportSettings) => {},
    cancelExport: () => {},
  };
}
