import React from 'react';
import { AbsoluteFill, Sequence, useVideoConfig } from 'remotion';
import type { RemotionInputProps } from '@/types/export';
import { Item } from '../components/item';
import { generateStableKey } from '../utils/generate-stable-key';

/**
 * Main Remotion Composition
 *
 * Renders all tracks following Remotion best practices:
 * - Media items (video/audio) rendered at composition level for stable keys
 *   This prevents remounting when items are split or moved across tracks
 * - Non-media items (text, images, shapes) rendered per-track
 * - Z-index based on track order for proper layering
 * - Respects track visibility, mute, and solo states
 * - Pre-mounts media items 2 seconds early for smooth transitions
 */
export const MainComposition: React.FC<RemotionInputProps> = ({ tracks }) => {
  const { fps } = useVideoConfig();
  const hasSoloTracks = tracks.some((track) => track.solo);

  // Filter visible tracks
  const visibleTracks = tracks.filter((track) => {
    if (hasSoloTracks) return track.solo;
    return track.visible !== false;
  });

  // Collect ALL media items (video/audio) from visible tracks with z-index and mute state
  const mediaItems = visibleTracks.flatMap((track) =>
    track.items
      .filter((item) => item.type === 'video' || item.type === 'audio')
      .map((item) => ({
        ...item,
        zIndex: track.order,
        muted: track.muted,
      }))
  );

  // Collect non-media items per track (text, image, shape)
  const nonMediaByTrack = visibleTracks.map((track) => ({
    ...track,
    items: track.items.filter(
      (item) => item.type !== 'video' && item.type !== 'audio'
    ),
  }));

  return (
    <AbsoluteFill>
      {/* MEDIA LAYER - All video/audio at composition level (prevents cross-track remounts) */}
      {mediaItems.map((item) => {
        const premountFrames = Math.round(fps * 2);
        return (
          <Sequence
            key={generateStableKey(item)}
            from={item.from}
            durationInFrames={item.durationInFrames}
            premountFor={premountFrames}
          >
            <AbsoluteFill style={{ zIndex: item.zIndex }}>
              <Item item={item} muted={item.muted} />
            </AbsoluteFill>
          </Sequence>
        );
      })}

      {/* NON-MEDIA LAYERS - Track-based rendering for text/shapes/images */}
      {nonMediaByTrack
        .filter((track) => track.items.length > 0)
        .map((track) => (
          <AbsoluteFill key={track.id} style={{ zIndex: track.order }}>
            {track.items.map((item) => (
              <Sequence
                key={item.id}
                from={item.from}
                durationInFrames={item.durationInFrames}
              >
                <Item item={item} muted={false} />
              </Sequence>
            ))}
          </AbsoluteFill>
        ))}
    </AbsoluteFill>
  );
};
