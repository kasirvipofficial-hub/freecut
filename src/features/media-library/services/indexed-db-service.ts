import type { MediaMetadata, ProjectMetadata, ThumbnailData } from '@/types/storage';

export class IndexedDBService {
  private dbName = 'video-editor-db';
  private version = 1;

  async saveMediaMetadata(metadata: MediaMetadata): Promise<void> {
    // TODO: Implement IndexedDB save
  }

  async getMediaMetadata(id: string): Promise<MediaMetadata | null> {
    // TODO: Implement IndexedDB get
    return null;
  }

  async getAllMediaMetadata(): Promise<MediaMetadata[]> {
    // TODO: Implement IndexedDB get all
    return [];
  }

  async deleteMediaMetadata(id: string): Promise<void> {
    // TODO: Implement IndexedDB delete
  }

  async saveProjectMetadata(metadata: ProjectMetadata): Promise<void> {
    // TODO: Implement project metadata save
  }

  async getProjectMetadata(id: string): Promise<ProjectMetadata | null> {
    // TODO: Implement project metadata get
    return null;
  }

  async saveThumbnail(thumbnail: ThumbnailData): Promise<void> {
    // TODO: Implement thumbnail save
  }

  async getThumbnail(id: string): Promise<ThumbnailData | null> {
    // TODO: Implement thumbnail get
    return null;
  }
}

export const indexedDBService = new IndexedDBService();
