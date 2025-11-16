import type { MediaMetadata, ThumbnailData } from '@/types/storage';

export class MediaLibraryService {
  async getAllMedia(): Promise<MediaMetadata[]> {
    // TODO: Implement get all media
    return [];
  }

  async uploadMedia(file: File): Promise<MediaMetadata> {
    // TODO: Implement media upload
    throw new Error('Not implemented');
  }

  async deleteMedia(id: string): Promise<void> {
    // TODO: Implement media deletion
  }

  async getThumbnail(mediaId: string): Promise<ThumbnailData | null> {
    // TODO: Implement thumbnail retrieval
    return null;
  }

  async getStorageUsage(): Promise<{ used: number; quota: number }> {
    // TODO: Implement storage usage calculation
    return { used: 0, quota: 0 };
  }
}

export const mediaLibraryService = new MediaLibraryService();
