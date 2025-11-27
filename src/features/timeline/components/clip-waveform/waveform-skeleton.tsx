import { memo } from 'react';

// Waveform dimensions
const WAVEFORM_HEIGHT = 32;

export interface WaveformSkeletonProps {
  /** Width of the clip in pixels */
  clipWidth: number;
  /** Height of the skeleton (default: 32px) */
  height?: number;
}

/**
 * Waveform Skeleton Component
 *
 * Simple static placeholder shown while waveform data is being generated.
 */
export const WaveformSkeleton = memo(function WaveformSkeleton({
  clipWidth: _clipWidth,
  height = WAVEFORM_HEIGHT,
}: WaveformSkeletonProps) {
  // Simple static placeholder - just a subtle background
  return (
    <div
      className="absolute inset-0 bg-timeline-audio/10"
      style={{ height }}
    />
  );
});
