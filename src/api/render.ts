import { apiClient } from './client';
import type { RemotionInputProps, ExportSettings } from '@/types/export';

export interface StartRenderRequest {
  composition: RemotionInputProps;
  settings: ExportSettings;
}

export interface RenderStatus {
  jobId: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  progress: number;
  outputUrl?: string;
  error?: string;
}

export async function startRender(request: StartRenderRequest): Promise<RenderStatus> {
  // TODO: Implement start render
  return apiClient.post<RenderStatus>('/render', request);
}

export async function getRenderStatus(jobId: string): Promise<RenderStatus> {
  // TODO: Implement get render status
  return apiClient.get<RenderStatus>(`/render/${jobId}`);
}

export async function cancelRender(jobId: string): Promise<void> {
  // TODO: Implement cancel render
  return apiClient.delete<void>(`/render/${jobId}`);
}
