import { useCallback, useMemo } from 'react';
import { Video } from 'lucide-react';
import type { TimelineItem, VideoItem } from '@/types/timeline';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import {
  PropertySection,
  PropertyRow,
  NumberInput,
  SliderInput,
} from '../components';

interface VideoSectionProps {
  items: TimelineItem[];
}

type MixedValue = number | 'mixed';

/**
 * Get a value from video items, returning 'mixed' if they differ.
 */
function getMixedVideoValue(
  items: TimelineItem[],
  getter: (item: VideoItem) => number | undefined
): MixedValue {
  const videoItems = items.filter((item): item is VideoItem => item.type === 'video');
  if (videoItems.length === 0) return 1;

  const values = videoItems.map((item) => getter(item) ?? 1);
  const firstValue = values[0]!; // Safe: videoItems.length > 0 checked above
  return values.every((v) => Math.abs(v - firstValue) < 0.001) ? firstValue : 'mixed';
}

/**
 * Video section - playback rate and video fades.
 * Only shown when selection includes video clips.
 */
export function VideoSection({ items }: VideoSectionProps) {
  const updateItem = useTimelineStore((s) => s.updateItem);

  const videoItems = useMemo(
    () => items.filter((item): item is VideoItem => item.type === 'video'),
    [items]
  );

  const itemIds = useMemo(() => videoItems.map((item) => item.id), [videoItems]);

  // Get current values
  const speed = getMixedVideoValue(videoItems, (item) => item.speed);
  const fadeIn = getMixedVideoValue(videoItems, (item) => item.fadeIn);
  const fadeOut = getMixedVideoValue(videoItems, (item) => item.fadeOut);

  const handleSpeedChange = useCallback(
    (value: number) => {
      itemIds.forEach((id) => updateItem(id, { speed: value }));
    },
    [itemIds, updateItem]
  );

  const handleFadeInChange = useCallback(
    (value: number) => {
      itemIds.forEach((id) => updateItem(id, { fadeIn: value }));
    },
    [itemIds, updateItem]
  );

  const handleFadeOutChange = useCallback(
    (value: number) => {
      itemIds.forEach((id) => updateItem(id, { fadeOut: value }));
    },
    [itemIds, updateItem]
  );

  if (videoItems.length === 0) return null;

  return (
    <PropertySection title="Video" icon={Video} defaultOpen={true}>
      {/* Playback Rate */}
      <PropertyRow label="Speed">
        <SliderInput
          value={speed}
          onChange={handleSpeedChange}
          min={0.1}
          max={4}
          step={0.01}
          formatValue={(v) => `${v.toFixed(2)}x`}
        />
      </PropertyRow>

      {/* Video Fades */}
      <PropertyRow label="Fade In">
        <NumberInput
          value={fadeIn === 'mixed' ? 'mixed' : fadeIn}
          onChange={handleFadeInChange}
          unit="s"
          min={0}
          max={10}
          step={0.1}
        />
      </PropertyRow>

      <PropertyRow label="Fade Out">
        <NumberInput
          value={fadeOut === 'mixed' ? 'mixed' : fadeOut}
          onChange={handleFadeOutChange}
          unit="s"
          min={0}
          max={10}
          step={0.1}
        />
      </PropertyRow>
    </PropertySection>
  );
}
