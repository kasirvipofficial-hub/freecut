import { useMemo, useCallback, useRef, useEffect } from 'react';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import { useTimelineStore } from '@/features/timeline/stores/timeline-store';
import { usePlaybackStore } from '@/features/preview/stores/playback-store';
import { useGizmoStore } from '../stores/gizmo-store';
import { TransformGizmo } from './transform-gizmo';
import { SelectableItem } from './selectable-item';
import { SnapGuides } from './snap-guides';
import { screenToCanvas } from '../utils/coordinate-transform';
import type { CoordinateParams, Transform } from '../types/gizmo';
import type { TransformProperties } from '@/types/transform';

interface GizmoOverlayProps {
  containerRect: DOMRect | null;
  playerSize: { width: number; height: number };
  projectSize: { width: number; height: number };
  zoom: number;
}

/**
 * Overlay that renders transform gizmos for selected items
 * and clickable hit areas for all visible items.
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
  const selectItems = useSelectionStore((s) => s.selectItems);

  // Timeline state and actions
  const items = useTimelineStore((s) => s.items);
  const updateItemTransform = useTimelineStore((s) => s.updateItemTransform);

  // Playback state - get current frame to determine visible items
  const currentFrame = usePlaybackStore((s) => s.currentFrame);

  // Gizmo store
  const setCanvasSize = useGizmoStore((s) => s.setCanvasSize);
  const snapLines = useGizmoStore((s) => s.snapLines);
  const startTranslate = useGizmoStore((s) => s.startTranslate);
  const updateInteraction = useGizmoStore((s) => s.updateInteraction);
  const endInteraction = useGizmoStore((s) => s.endInteraction);
  const clearInteraction = useGizmoStore((s) => s.clearInteraction);

  // Update canvas size in gizmo store when project size changes
  useEffect(() => {
    setCanvasSize(projectSize.width, projectSize.height);
  }, [projectSize.width, projectSize.height, setCanvasSize]);

  // Get visual items visible at current frame (excluding audio)
  const visibleItems = useMemo(() => {
    return items.filter((item) => {
      // Only visual items (not audio)
      if (item.type === 'audio') return false;
      // Check if item is visible at current frame
      const itemEnd = item.from + item.durationInFrames;
      return currentFrame >= item.from && currentFrame < itemEnd;
    });
  }, [items, currentFrame]);

  // Get selected items
  const selectedItems = useMemo(() => {
    return visibleItems.filter((item) => selectedItemIds.includes(item.id));
  }, [visibleItems, selectedItemIds]);

  // Get unselected visible items (for click-to-select)
  const unselectedItems = useMemo(() => {
    return visibleItems.filter((item) => !selectedItemIds.includes(item.id));
  }, [visibleItems, selectedItemIds]);

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
      // Include cornerRadius to preserve it during transform operations
      const transformProps: Partial<TransformProperties> = {
        x: transform.x,
        y: transform.y,
        width: transform.width,
        height: transform.height,
        rotation: transform.rotation,
        opacity: transform.opacity,
        cornerRadius: transform.cornerRadius,
      };

      updateItemTransform(itemId, transformProps);
    },
    [updateItemTransform]
  );

  // Handle click on overlay background to deselect
  const handleBackgroundClick = useCallback(
    (e: React.MouseEvent) => {
      // Only deselect if clicking directly on the overlay (not on a gizmo or selectable item)
      if (e.target === overlayRef.current) {
        useSelectionStore.getState().clearItemSelection();
      }
    },
    []
  );

  // Handle clicking an unselected item to select it
  const handleItemSelect = useCallback(
    (itemId: string, e: React.MouseEvent) => {
      e.stopPropagation();
      // Shift+click for multi-select, otherwise replace selection
      if (e.shiftKey) {
        selectItems([...selectedItemIds, itemId]);
      } else {
        selectItems([itemId]);
      }
    },
    [selectItems, selectedItemIds]
  );

  // Check if transform actually changed (within tolerance)
  const transformChanged = useCallback((a: Transform, b: Transform): boolean => {
    const tolerance = 0.01;
    return (
      Math.abs(a.x - b.x) > tolerance ||
      Math.abs(a.y - b.y) > tolerance ||
      Math.abs(a.width - b.width) > tolerance ||
      Math.abs(a.height - b.height) > tolerance ||
      Math.abs(a.rotation - b.rotation) > tolerance
    );
  }, []);

  // Handle drag start from SelectableItem - select and start dragging in one motion
  const handleItemDragStart = useCallback(
    (itemId: string, e: React.MouseEvent, transform: Transform) => {
      if (!coordParams) return;

      const startTransformSnapshot = { ...transform };
      const point = screenToCanvas(e.clientX, e.clientY, coordParams);

      startTranslate(itemId, point, transform);
      document.body.style.cursor = 'move';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const movePoint = screenToCanvas(moveEvent.clientX, moveEvent.clientY, coordParams);
        updateInteraction(movePoint, moveEvent.shiftKey);
      };

      const handleMouseUp = () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        document.body.style.cursor = '';

        const finalTransform = endInteraction();
        if (finalTransform && transformChanged(startTransformSnapshot, finalTransform)) {
          handleTransformEnd(itemId, finalTransform);
        }
        requestAnimationFrame(() => {
          clearInteraction();
        });
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [coordParams, startTranslate, updateInteraction, endInteraction, clearInteraction, handleTransformEnd, transformChanged]
  );

  // Don't render if no coordinate params
  if (!coordParams) {
    return null;
  }

  // Don't render if no visible items
  if (visibleItems.length === 0) {
    return null;
  }

  return (
    <div
      ref={overlayRef}
      className="absolute z-10"
      style={{
        top: 0,
        left: 0,
        width: playerSize.width,
        height: playerSize.height,
      }}
      onClick={handleBackgroundClick}
      onDoubleClick={(e) => e.stopPropagation()}
    >
      {/* Clickable areas for unselected items (behind selected gizmos) */}
      {unselectedItems.map((item) => (
        <SelectableItem
          key={item.id}
          item={item}
          coordParams={coordParams}
          onSelect={(e) => handleItemSelect(item.id, e)}
          onDragStart={(e, transform) => handleItemDragStart(item.id, e, transform)}
        />
      ))}

      {/* Transform gizmos for selected items (on top) */}
      {selectedItems.map((item) => (
        <TransformGizmo
          key={item.id}
          item={item}
          coordParams={coordParams}
          onTransformStart={handleTransformStart}
          onTransformEnd={(transform) => handleTransformEnd(item.id, transform)}
        />
      ))}

      {/* Snap guides shown during drag */}
      <SnapGuides snapLines={snapLines} coordParams={coordParams} />
    </div>
  );
}
