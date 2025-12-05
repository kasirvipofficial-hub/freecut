/**
 * Stable Video Sequence
 *
 * A wrapper around Remotion's Sequence that uses a stable key based on
 * originId for video items. This prevents video remounting when clips
 * are split, as split clips share the same originId.
 *
 * The key insight: React's reconciliation won't remount a component if
 * its key stays the same. By keying video Sequences by originId instead
 * of item.id, split clips reuse the same Sequence/video element.
 */

import React, { useMemo } from 'react';
import { Sequence, useCurrentFrame, useVideoConfig } from 'remotion';
import type { VideoItem } from '@/types/timeline';

/** Video item with additional properties added by MainComposition */
type EnrichedVideoItem = VideoItem & {
  zIndex: number;
  muted: boolean;
};

interface StableVideoSequenceProps {
  /** All video items that might share the same origin */
  items: EnrichedVideoItem[];
  /** Render function for the video content */
  renderItem: (item: EnrichedVideoItem) => React.ReactNode;
  /** Number of frames to premount */
  premountFor?: number;
}

interface VideoGroup {
  originKey: string;
  items: EnrichedVideoItem[];
  minFrom: number;
  maxEnd: number;
}

/**
 * Groups video items by their origin key (mediaId-originId-speed)
 */
function groupByOrigin(items: EnrichedVideoItem[]): VideoGroup[] {
  const groups = new Map<string, VideoGroup>();

  for (const item of items) {
    const originId = item.originId || item.id;
    const key = `${item.mediaId}-${originId}-${item.speed || 1}`;

    const existing = groups.get(key);
    if (existing) {
      existing.items.push(item);
      existing.minFrom = Math.min(existing.minFrom, item.from);
      existing.maxEnd = Math.max(existing.maxEnd, item.from + item.durationInFrames);
    } else {
      groups.set(key, {
        originKey: key,
        items: [item],
        minFrom: item.from,
        maxEnd: item.from + item.durationInFrames,
      });
    }
  }

  return Array.from(groups.values());
}

/**
 * Renders the active item from a group based on current frame
 */
const GroupRenderer: React.FC<{
  group: VideoGroup;
  renderItem: (item: EnrichedVideoItem) => React.ReactNode;
}> = React.memo(({ group, renderItem }) => {
  // useCurrentFrame() returns LOCAL frame relative to the Sequence's `from`
  const localFrame = useCurrentFrame();
  // Convert to global frame for comparison with item.from (which is global)
  const globalFrame = localFrame + group.minFrom;

  // Find the active item for current frame
  const activeItem = group.items.find(
    (item) => globalFrame >= item.from && globalFrame < item.from + item.durationInFrames
  );

  if (!activeItem) {
    return null;
  }

  // CRITICAL: Adjust sourceStart to account for the shared Sequence.
  // In a shared Sequence, localFrame is relative to group.minFrom, not item.from.
  // OffthreadVideo calculates: trimBefore + localFrame
  // We need: sourceStart + (globalFrame - item.from) = sourceStart + localFrame - (item.from - minFrom)
  // So: adjustedTrimBefore = sourceStart - (item.from - minFrom)
  // This way: adjustedTrimBefore + localFrame = sourceStart + localFrame - item.from + minFrom
  //                                            = sourceStart + globalFrame - item.from ✓
  const itemOffset = activeItem.from - group.minFrom;
  const adjustedItem = {
    ...activeItem,
    sourceStart: (activeItem.sourceStart ?? 0) - itemOffset,
    // Also adjust trimStart and offset if they exist
    trimStart: activeItem.trimStart != null ? activeItem.trimStart - itemOffset : undefined,
    offset: activeItem.offset != null ? activeItem.offset - itemOffset : undefined,
  };

  return <>{renderItem(adjustedItem)}</>;
});

GroupRenderer.displayName = 'GroupRenderer';

/**
 * Renders video items with stable keys based on origin.
 *
 * Items sharing the same originId are grouped into a single Sequence
 * with a stable key. This prevents remounting when clips are split.
 */
export const StableVideoSequence: React.FC<StableVideoSequenceProps> = ({
  items,
  renderItem,
  premountFor = 0,
}) => {
  const { fps } = useVideoConfig();
  const defaultPremount = premountFor || Math.round(fps * 2);

  const groups = useMemo(() => groupByOrigin(items), [items]);

  return (
    <>
      {groups.map((group) => (
        <Sequence
          key={group.originKey} // Stable key - doesn't change on split!
          from={group.minFrom}
          durationInFrames={group.maxEnd - group.minFrom}
          premountFor={defaultPremount}
        >
          <GroupRenderer group={group} renderItem={renderItem} />
        </Sequence>
      ))}
    </>
  );
};
