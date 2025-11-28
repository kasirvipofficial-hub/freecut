import { useCallback, useMemo } from 'react';
import { Volume2 } from 'lucide-react';
import type { TimelineItem, VideoItem, AudioItem } from '@/types/timeline';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import {
  PropertySection,
  PropertyRow,
  NumberInput,
  SliderInput,
} from '../components';

interface AudioSectionProps {
  items: TimelineItem[];
}

type MixedValue = number | 'mixed';

type AudioCapableItem = VideoItem | AudioItem;

/**
 * Get a value from audio-capable items, returning 'mixed' if they differ.
 */
function getMixedAudioValue(
  items: TimelineItem[],
  getter: (item: AudioCapableItem) => number | undefined
): MixedValue {
  const audioItems = items.filter(
    (item): item is AudioCapableItem =>
      item.type === 'video' || item.type === 'audio'
  );
  if (audioItems.length === 0) return 0;

  const values = audioItems.map((item) => getter(item) ?? 0);
  const firstValue = values[0]!; // Safe: audioItems.length > 0 checked above
  return values.every((v) => Math.abs(v - firstValue) < 0.01) ? firstValue : 'mixed';
}

/**
 * Audio section - volume and audio fades.
 * Shown for video and audio clips.
 */
export function AudioSection({ items }: AudioSectionProps) {
  const updateItem = useTimelineStore((s) => s.updateItem);

  const audioItems = useMemo(
    () =>
      items.filter(
        (item): item is AudioCapableItem =>
          item.type === 'video' || item.type === 'audio'
      ),
    [items]
  );

  const itemIds = useMemo(() => audioItems.map((item) => item.id), [audioItems]);

  // Get current values
  const volume = getMixedAudioValue(audioItems, (item) => item.volume);
  const fadeIn = getMixedAudioValue(audioItems, (item) => item.audioFadeIn);
  const fadeOut = getMixedAudioValue(audioItems, (item) => item.audioFadeOut);

  const handleVolumeChange = useCallback(
    (value: number) => {
      itemIds.forEach((id) => updateItem(id, { volume: value }));
    },
    [itemIds, updateItem]
  );

  const handleFadeInChange = useCallback(
    (value: number) => {
      itemIds.forEach((id) => updateItem(id, { audioFadeIn: value }));
    },
    [itemIds, updateItem]
  );

  const handleFadeOutChange = useCallback(
    (value: number) => {
      itemIds.forEach((id) => updateItem(id, { audioFadeOut: value }));
    },
    [itemIds, updateItem]
  );

  if (audioItems.length === 0) return null;

  // Format volume in dB
  const formatVolume = (v: number) => {
    if (v > 0) return `+${v.toFixed(1)} dB`;
    if (v < 0) return `${v.toFixed(1)} dB`;
    return '0.0 dB';
  };

  return (
    <PropertySection title="Audio" icon={Volume2} defaultOpen={true}>
      {/* Volume */}
      <PropertyRow label="Volume">
        <SliderInput
          value={volume}
          onChange={handleVolumeChange}
          min={-60}
          max={12}
          step={0.1}
          formatValue={formatVolume}
        />
      </PropertyRow>

      {/* Audio Fades */}
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
