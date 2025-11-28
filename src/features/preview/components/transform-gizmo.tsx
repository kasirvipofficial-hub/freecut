import { useMemo, useCallback, useEffect } from 'react';
import type { TimelineItem } from '@/types/timeline';
import type { GizmoHandle, Transform, CoordinateParams } from '../types/gizmo';
import { useGizmoStore } from '../stores/gizmo-store';
import {
  resolveTransform,
  getSourceDimensions,
} from '@/lib/remotion/utils/transform-resolver';
import {
  transformToScreenBounds,
  screenToCanvas,
  getScaleCursor,
} from '../utils/coordinate-transform';
import { cn } from '@/lib/utils';

const HANDLE_SIZE = 8;
const ROTATION_HANDLE_OFFSET = 24;

const SCALE_HANDLES: GizmoHandle[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];

interface TransformGizmoProps {
  item: TimelineItem;
  coordParams: CoordinateParams;
  onTransformStart: () => void;
  onTransformEnd: (transform: Transform) => void;
}

/**
 * Transform gizmo for a single selected item.
 * Renders selection box, scale handles, and rotation handle.
 */
export function TransformGizmo({
  item,
  coordParams,
  onTransformStart,
  onTransformEnd,
}: TransformGizmoProps) {
  // Gizmo store
  const activeGizmo = useGizmoStore((s) => s.activeGizmo);
  const previewTransform = useGizmoStore((s) => s.previewTransform);
  const startTranslate = useGizmoStore((s) => s.startTranslate);
  const startScale = useGizmoStore((s) => s.startScale);
  const startRotate = useGizmoStore((s) => s.startRotate);
  const updateInteraction = useGizmoStore((s) => s.updateInteraction);
  const endInteraction = useGizmoStore((s) => s.endInteraction);
  const cancelInteraction = useGizmoStore((s) => s.cancelInteraction);

  const isInteracting = activeGizmo?.itemId === item.id;

  // Get current transform (use preview during interaction)
  const currentTransform = useMemo((): Transform => {
    if (isInteracting && previewTransform) {
      return previewTransform;
    }

    // Resolve from item
    const sourceDimensions = getSourceDimensions(item);
    const resolved = resolveTransform(
      item,
      { width: coordParams.projectSize.width, height: coordParams.projectSize.height, fps: 30 },
      sourceDimensions
    );

    return {
      x: resolved.x,
      y: resolved.y,
      width: resolved.width,
      height: resolved.height,
      rotation: resolved.rotation,
      opacity: resolved.opacity,
    };
  }, [item, coordParams, isInteracting, previewTransform]);

  // Convert to screen bounds
  const screenBounds = useMemo(() => {
    return transformToScreenBounds(currentTransform, coordParams);
  }, [currentTransform, coordParams]);

  // Helper to convert screen position to canvas position
  const toCanvasPoint = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      return screenToCanvas(e.clientX, e.clientY, coordParams);
    },
    [coordParams]
  );

  // Handle position for each scale handle
  const getHandleStyle = useCallback(
    (handle: GizmoHandle): React.CSSProperties => {
      const half = HANDLE_SIZE / 2;
      const { width, height } = screenBounds;

      const positions: Record<string, React.CSSProperties> = {
        nw: { left: -half, top: -half },
        n: { left: width / 2 - half, top: -half },
        ne: { left: width - half, top: -half },
        e: { left: width - half, top: height / 2 - half },
        se: { left: width - half, top: height - half },
        s: { left: width / 2 - half, top: height - half },
        sw: { left: -half, top: height - half },
        w: { left: -half, top: height / 2 - half },
      };

      return {
        position: 'absolute',
        width: HANDLE_SIZE,
        height: HANDLE_SIZE,
        ...positions[handle],
        cursor: getScaleCursor(handle, currentTransform.rotation),
      };
    },
    [screenBounds, currentTransform.rotation]
  );

  // Mouse event handlers
  const handleTranslateStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const point = toCanvasPoint(e);
      startTranslate(item.id, point, currentTransform);
      onTransformStart();
      document.body.style.cursor = 'move';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const movePoint = toCanvasPoint(moveEvent);
        updateInteraction(movePoint, moveEvent.shiftKey);
      };

      const handleMouseUp = () => {
        const finalTransform = endInteraction();
        if (finalTransform) {
          onTransformEnd(finalTransform);
        }
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [item.id, currentTransform, toCanvasPoint, startTranslate, updateInteraction, endInteraction, onTransformStart, onTransformEnd]
  );

  const handleScaleStart = useCallback(
    (handle: GizmoHandle, e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const point = toCanvasPoint(e);
      startScale(item.id, handle, point, currentTransform);
      onTransformStart();
      document.body.style.cursor = getScaleCursor(handle, currentTransform.rotation);

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const movePoint = toCanvasPoint(moveEvent);
        updateInteraction(movePoint, moveEvent.shiftKey);
      };

      const handleMouseUp = () => {
        const finalTransform = endInteraction();
        if (finalTransform) {
          onTransformEnd(finalTransform);
        }
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [item.id, currentTransform, toCanvasPoint, startScale, updateInteraction, endInteraction, onTransformStart, onTransformEnd]
  );

  const handleRotateStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();
      e.preventDefault();
      const point = toCanvasPoint(e);
      startRotate(item.id, point, currentTransform);
      onTransformStart();
      document.body.style.cursor = 'crosshair';

      const handleMouseMove = (moveEvent: MouseEvent) => {
        const movePoint = toCanvasPoint(moveEvent);
        updateInteraction(movePoint, moveEvent.shiftKey);
      };

      const handleMouseUp = () => {
        const finalTransform = endInteraction();
        if (finalTransform) {
          onTransformEnd(finalTransform);
        }
        document.body.style.cursor = '';
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
      };

      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
    },
    [item.id, currentTransform, toCanvasPoint, startRotate, updateInteraction, endInteraction, onTransformStart, onTransformEnd]
  );

  // Handle escape key to cancel interaction
  useEffect(() => {
    if (!isInteracting) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        cancelInteraction();
        document.body.style.cursor = '';
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isInteracting, cancelInteraction]);

  return (
    <div
      className="absolute pointer-events-none"
      style={{
        left: screenBounds.left,
        top: screenBounds.top,
        width: screenBounds.width,
        height: screenBounds.height,
        transform: `rotate(${currentTransform.rotation}deg)`,
        transformOrigin: 'center center',
      }}
    >
      {/* Selection border */}
      <div
        className={cn(
          'absolute inset-0 border-2 border-dashed pointer-events-auto cursor-move',
          isInteracting ? 'border-primary' : 'border-blue-500'
        )}
        onMouseDown={handleTranslateStart}
      />

      {/* Scale handles */}
      {SCALE_HANDLES.map((handle) => (
        <div
          key={handle}
          className="bg-white border border-blue-500 pointer-events-auto"
          style={getHandleStyle(handle)}
          onMouseDown={(e) => handleScaleStart(handle, e)}
        />
      ))}

      {/* Rotation handle */}
      <div
        className="absolute bg-white border border-blue-500 rounded-full pointer-events-auto cursor-crosshair"
        style={{
          width: 10,
          height: 10,
          left: '50%',
          top: -ROTATION_HANDLE_OFFSET,
          marginLeft: -5,
        }}
        onMouseDown={handleRotateStart}
      />

      {/* Rotation guide line */}
      <div
        className="absolute border-l border-dashed border-blue-500 pointer-events-none"
        style={{
          left: '50%',
          top: -ROTATION_HANDLE_OFFSET + 10,
          height: ROTATION_HANDLE_OFFSET - 10,
        }}
      />
    </div>
  );
}
