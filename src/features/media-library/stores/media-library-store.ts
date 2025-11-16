import { create } from 'zustand';
import type { MediaLibraryState, MediaLibraryActions } from '../types';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const mediaItems = useMediaLibraryStore(s => s.mediaItems);
// const uploadMedia = useMediaLibraryStore(s => s.uploadMedia);
//
// ❌ WRONG: Don't destructure the entire store
// const { mediaItems, uploadMedia } = useMediaLibraryStore();

export const useMediaLibraryStore = create<MediaLibraryState & MediaLibraryActions>((set) => ({
  // State
  mediaItems: [],
  isLoading: false,
  uploadProgress: 0,
  selectedMediaIds: [],
  searchQuery: '',
  filterByType: null,
  sortBy: 'date',
  storageUsed: 0,
  storageQuota: 0,

  // Actions
  loadMediaItems: async () => {
    // TODO: Implement load media items
  },
  uploadMedia: async (file) => {
    // TODO: Implement upload media
    throw new Error('Not implemented');
  },
  deleteMedia: async (id) => {
    // TODO: Implement delete media
  },
  selectMedia: (ids) => set({ selectedMediaIds: ids }),
  setSearchQuery: (query) => set({ searchQuery: query }),
  setFilterByType: (type) => set({ filterByType: type }),
  setSortBy: (sortBy) => set({ sortBy }),
}));
