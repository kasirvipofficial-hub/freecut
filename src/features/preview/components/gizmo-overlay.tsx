import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { useGizmoStore } from '../stores/gizmo-store';
import { TransformGizmo } from './transform-gizmo';
import type { CoordinateParams, Transform } from '../types/gizmo';
import type { TransformProperties } from '@/types/transform';

interface GizmoOverlayProps {
  containerRect: DOMRect | null;
  playerSize: { width: number; height: number };
  projectSize: { width: number; height: number };
  zoom: number;
}

/**
 * Overlay that renders transform gizmos for selected items.
 * Positioned absolutely over the video player.
 */
export function GizmoOverlay({
  containerRect,
  playerSize,
  projectSize,
  zoom,
}: GizmoOverlayProps) {
  const overlayRef = useRef<HTMLDivElement>(null);

  // Selection state
  const selectedItemIds = useSelectionStore((s) => s.selectedItemIds);

  // Timeline state and actions
  const items = useTimelineStore((s) => s.items);
  const updateItemTransform = useTimelineStore((s) => s.updateItemTransform);

  // Gizmo store
  const setCanvasSize = useGizmoStore((s) => s.setCanvasSize);

  // Update canvas size in gizmo store when project size changes
  useEffect(() => {
    setCanvasSize(projectSize.width, projectSize.height);
  }, [projectSize.width, projectSize.height, setCanvasSize]);

  // Get selected items
  const selectedItems = useMemo(() => {
    return items.filter((item) => selectedItemIds.includes(item.id));
  }, [items, selectedItemIds]);

  // Coordinate params for gizmo positioning
  const coordParams: CoordinateParams | null = useMemo(() => {
    if (!containerRect) return null;

    return {
      containerRect,
      playerSize,
      projectSize,
      zoom,
    };
  }, [containerRect, playerSize, projectSize, zoom]);

  // Handle transform start - nothing needed, gizmo store handles it
  const handleTransformStart = useCallback(() => {
    // Optionally: could pause playback here
  }, []);

  // Handle transform end - commit the transform to the timeline
  const handleTransformEnd = useCallback(
    (itemId: string, transform: Transform) => {
      // Convert gizmo transform to TransformProperties
      const transformProps: Partial<TransformProperties> = {
        x: transform.x,
        y: transform.y,
        width: transform.width,
        height: transform.height,
        rotation: transform.rotation,
        opacity: transform.opacity,
      };

      updateItemTransform(itemId, transformProps);
    },
    [updateItemTransform]
  );

  // Handle click on overlay background to deselect
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on the overlay (not on a gizmo)
      if (e.target === overlayRef.current) {
        useSelectionStore.getState().clearItemSelection();
      }
    },
    []
  );

  // Don't render if no coordinate params or no selection
  if (!coordParams || selectedItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="absolute inset-0 z-10"
      onClick={handleBackgroundClick}
    >
      {selectedItems.map((item) => (
        <TransformGizmo
          key={item.id}
          item={item}
          coordParams={coordParams}
          onTransformStart={handleTransformStart}
          onTransformEnd={(transform) => handleTransformEnd(item.id, transform)}
        />
      ))}
    </div>
  );
}
