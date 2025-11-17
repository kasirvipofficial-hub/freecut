import { useCallback } from 'react';
import type { TimelineItem } from '@/types/timeline';
import { useTimelineStore } from '../stores/timeline-store';
import {
  findOverlappingItems,
  calculatePushPositions,
  resolveCollisionsCascade,
  wouldCauseOverlap,
} from '../utils/collision-utils';

/**
 * Collision detection result
 */
export interface CollisionResult {
  /** Whether a collision would occur */
  hasCollision: boolean;
  /** Items that would be pushed */
  pushedItems: Array<{ id: string; from: number }>;
  /** Total number of items affected (including cascades) */
  affectedCount: number;
}

/**
 * Collision detector hook
 *
 * Detects overlaps and calculates push-forward positions
 * Handles cascade effects where pushed items push other items
 */
export function useCollisionDetector() {
  // Get items with granular selector
  const items = useTimelineStore((s) => s.items);

  /**
   * Check if moving an item would cause a collision
   * Returns collision information including pushed items
   */
  const checkCollision = useCallback(
    (
      itemId: string,
      newFrom: number,
      newTrackId: string,
      excludeItemIds: string[] = []
    ): CollisionResult => {
      const item = items.find((i) => i.id === itemId);
      if (!item) {
        return {
          hasCollision: false,
          pushedItems: [],
          affectedCount: 0,
        };
      }

      // Find overlapping items
      const overlapping = findOverlappingItems(
        itemId,
        newFrom,
        item.durationInFrames,
        newTrackId,
        items,
        excludeItemIds
      );

      if (overlapping.length === 0) {
        return {
          hasCollision: false,
          pushedItems: [],
          affectedCount: 0,
        };
      }

      // Calculate initial push positions
      const blockingEnd = newFrom + item.durationInFrames;
      const initialPushes = calculatePushPositions(overlapping, blockingEnd);

      // Resolve cascading collisions
      const allPushes = resolveCollisionsCascade(
        initialPushes,
        newTrackId,
        items,
        [itemId, ...excludeItemIds]
      );

      return {
        hasCollision: true,
        pushedItems: allPushes,
        affectedCount: allPushes.length,
      };
    },
    [items]
  );

  /**
   * Simple check if position would cause overlap (no push calculation)
   */
  const wouldOverlap = useCallback(
    (itemId: string, newFrom: number, trackId: string): boolean => {
      const item = items.find((i) => i.id === itemId);
      if (!item) return false;

      return wouldCauseOverlap(itemId, newFrom, item.durationInFrames, trackId, items);
    },
    [items]
  );

  /**
   * Resolve collisions for multiple items being moved (multi-select)
   * Returns all push updates needed
   */
  const resolveMultiItemCollisions = useCallback(
    (
      movedItems: Array<{
        id: string;
        newFrom: number;
        newTrackId: string;
        durationInFrames: number;
      }>
    ): Array<{ id: string; from: number }> => {
      const allPushes = new Map<string, number>();
      const movedItemIds = movedItems.map((i) => i.id);

      // Check each moved item for collisions
      for (const moved of movedItems) {
        const overlapping = findOverlappingItems(
          moved.id,
          moved.newFrom,
          moved.durationInFrames,
          moved.newTrackId,
          items,
          movedItemIds
        );

        if (overlapping.length > 0) {
          const blockingEnd = moved.newFrom + moved.durationInFrames;
          const pushes = calculatePushPositions(overlapping, blockingEnd);

          // Merge with existing pushes (keep furthest push)
          for (const push of pushes) {
            const existing = allPushes.get(push.id);
            if (!existing || push.from > existing) {
              allPushes.set(push.id, push.from);
            }
          }
        }
      }

      // Resolve cascades for all pushed items
      // We need to check each track separately
      const trackGroups = new Map<string, Array<{ id: string; from: number }>>();

      for (const [id, from] of allPushes) {
        const item = items.find((i) => i.id === id);
        if (item) {
          const trackPushes = trackGroups.get(item.trackId) || [];
          trackPushes.push({ id, from });
          trackGroups.set(item.trackId, trackPushes);
        }
      }

      // Resolve cascades per track
      const finalPushes: Array<{ id: string; from: number }> = [];
      for (const [trackId, pushes] of trackGroups) {
        const resolved = resolveCollisionsCascade(pushes, trackId, items, movedItemIds);
        finalPushes.push(...resolved);
      }

      return finalPushes;
    },
    [items]
  );

  return {
    checkCollision,
    wouldOverlap,
    resolveMultiItemCollisions,
  };
}
