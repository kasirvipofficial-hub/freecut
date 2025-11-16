import type { ExportSettings, RemotionInputProps } from '@/types/export';

export interface RenderRequest {
  composition: RemotionInputProps;
  settings: ExportSettings;
}

export interface RenderResponse {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
}

export class RenderAPI {
  private baseUrl = '/api/render';

  async startRender(request: RenderRequest): Promise<RenderResponse> {
    // TODO: Implement start render
    throw new Error('Not implemented');
  }

  async getRenderStatus(jobId: string): Promise<RenderResponse> {
    // TODO: Implement get render status
    throw new Error('Not implemented');
  }

  async cancelRender(jobId: string): Promise<void> {
    // TODO: Implement cancel render
  }
}

export const renderAPI = new RenderAPI();
