import type { MediaMetadata } from '@/types/storage';

export interface MediaLibraryState {
  mediaItems: MediaMetadata[];
  isLoading: boolean;
  uploadProgress: number;
  selectedMediaIds: string[];
  searchQuery: string;
  filterByType: string | null;
  sortBy: 'name' | 'date' | 'size';
  storageUsed: number;
  storageQuota: number;
}

export interface MediaLibraryActions {
  loadMediaItems: () => Promise<void>;
  uploadMedia: (file: File) => Promise<MediaMetadata>;
  deleteMedia: (id: string) => Promise<void>;
  selectMedia: (ids: string[]) => void;
  setSearchQuery: (query: string) => void;
  setFilterByType: (type: string | null) => void;
  setSortBy: (sortBy: 'name' | 'date' | 'size') => void;
}
