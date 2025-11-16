import type { MediaMetadata } from '@/types/storage';

export interface MediaCardProps {
  media: MediaMetadata;
  selected?: boolean;
  onSelect?: () => void;
}

export function MediaCard(props: MediaCardProps) {
  // TODO: Implement media card component
  return null;
}
