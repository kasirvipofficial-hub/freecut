import type { CSSProperties } from 'react';
import type { Point, CoordinateParams, Transform, GizmoHandle } from '../types/gizmo';

// Default handle size for gizmo controls
export const HANDLE_SIZE = 8;
export const ROTATION_HANDLE_OFFSET = 24;

/**
 * Calculate the effective scale from zoom level.
 * When zoom is -1 (auto-fit), calculate based on container/project ratio.
 */
export function getEffectiveScale(params: CoordinateParams): number {
  const { playerSize, projectSize, zoom } = params;

  if (zoom === -1) {
    // Auto-fit: scale to fit project within player
    return Math.min(
      playerSize.width / projectSize.width,
      playerSize.height / projectSize.height
    );
  }

  return zoom;
}

/**
 * Convert screen coordinates (from mouse events) to canvas coordinates.
 * Accounts for: container position, player centering, zoom level.
 */
export function screenToCanvas(
  screenX: number,
  screenY: number,
  params: CoordinateParams
): Point {
  const { containerRect, playerSize, projectSize } = params;
  const scale = getEffectiveScale(params);

  // Calculate player position within container (centered)
  const playerOffsetX = (containerRect.width - playerSize.width) / 2;
  const playerOffsetY = (containerRect.height - playerSize.height) / 2;

  // Convert screen to player space
  const playerX = screenX - containerRect.left - playerOffsetX;
  const playerY = screenY - containerRect.top - playerOffsetY;

  // Convert player to canvas space
  return {
    x: playerX / scale,
    y: playerY / scale,
  };
}

/**
 * Convert canvas coordinates to screen coordinates.
 */
export function canvasToScreen(
  canvasX: number,
  canvasY: number,
  params: CoordinateParams
): Point {
  const { containerRect, playerSize } = params;
  const scale = getEffectiveScale(params);

  const playerX = canvasX * scale;
  const playerY = canvasY * scale;

  const playerOffsetX = (containerRect.width - playerSize.width) / 2;
  const playerOffsetY = (containerRect.height - playerSize.height) / 2;

  return {
    x: containerRect.left + playerOffsetX + playerX,
    y: containerRect.top + playerOffsetY + playerY,
  };
}

/**
 * Rotate a point around a center point.
 */
export function rotatePoint(
  point: Point,
  center: Point,
  angleDegrees: number
): Point {
  const rad = (angleDegrees * Math.PI) / 180;
  const cos = Math.cos(rad);
  const sin = Math.sin(rad);
  const dx = point.x - center.x;
  const dy = point.y - center.y;

  return {
    x: center.x + dx * cos - dy * sin,
    y: center.y + dx * sin + dy * cos,
  };
}

/**
 * Get the center point of a transform.
 * Transform x/y is offset from canvas center, so we need to calculate actual center.
 */
export function getTransformCenter(
  transform: Transform,
  canvasWidth: number,
  canvasHeight: number
): Point {
  return {
    x: canvasWidth / 2 + transform.x,
    y: canvasHeight / 2 + transform.y,
  };
}

/**
 * Convert transform bounds to screen rectangle.
 * Used for positioning the gizmo overlay.
 */
export function transformToScreenBounds(
  transform: Transform,
  params: CoordinateParams
): { left: number; top: number; width: number; height: number } {
  const { projectSize } = params;
  const scale = getEffectiveScale(params);

  // Transform x/y is offset from canvas center
  const canvasCenterX = projectSize.width / 2;
  const canvasCenterY = projectSize.height / 2;

  // Top-left corner in canvas space
  const canvasLeft = canvasCenterX + transform.x - transform.width / 2;
  const canvasTop = canvasCenterY + transform.y - transform.height / 2;

  // Convert to screen space relative to player
  return {
    left: canvasLeft * scale,
    top: canvasTop * scale,
    width: transform.width * scale,
    height: transform.height * scale,
  };
}

/**
 * Calculate angle in degrees from center to a point.
 */
export function getAngleFromCenter(point: Point, center: Point): number {
  return Math.atan2(point.y - center.y, point.x - center.x) * (180 / Math.PI);
}

/**
 * Get cursor style for a scale handle based on item rotation.
 * Cursors need to rotate with the item.
 */
export function getScaleCursor(
  handle: string,
  rotation: number
): string {
  // Base angles for each handle direction
  const baseAngles: Record<string, number> = {
    e: 0,
    se: 45,
    s: 90,
    sw: 135,
    w: 180,
    nw: 225,
    n: 270,
    ne: 315,
  };

  const baseAngle = baseAngles[handle] ?? 0;
  const adjustedAngle = (baseAngle + rotation + 360) % 360;

  // Map angle to cursor (every 45 degrees cycles through 4 cursor types)
  const cursorIndex = Math.round(adjustedAngle / 45) % 4;
  const cursors = ['ew-resize', 'nwse-resize', 'ns-resize', 'nesw-resize'];

  return cursors[cursorIndex];
}

/**
 * Screen bounds for a gizmo overlay.
 */
export interface ScreenBounds {
  left: number;
  top: number;
  width: number;
  height: number;
}

/**
 * Get handle positions for all scale handles relative to screen bounds.
 * Returns CSS-compatible positions.
 */
export function getHandlePositions(
  bounds: ScreenBounds,
  handleSize: number = HANDLE_SIZE
): Record<GizmoHandle, { left: number; top: number }> {
  const half = handleSize / 2;
  const { width, height } = bounds;

  return {
    nw: { left: -half, top: -half },
    n: { left: width / 2 - half, top: -half },
    ne: { left: width - half, top: -half },
    e: { left: width - half, top: height / 2 - half },
    se: { left: width - half, top: height - half },
    s: { left: width / 2 - half, top: height - half },
    sw: { left: -half, top: height - half },
    w: { left: -half, top: height / 2 - half },
    rotate: { left: width / 2 - half, top: -ROTATION_HANDLE_OFFSET - half },
  };
}

/**
 * Get CSS style for a specific scale/rotate handle.
 */
export function getHandleStyle(
  handle: GizmoHandle,
  bounds: ScreenBounds,
  rotation: number,
  handleSize: number = HANDLE_SIZE
): CSSProperties {
  const positions = getHandlePositions(bounds, handleSize);
  const pos = positions[handle];

  return {
    position: 'absolute',
    width: handleSize,
    height: handleSize,
    left: pos?.left ?? 0,
    top: pos?.top ?? 0,
    cursor: handle === 'rotate' ? 'crosshair' : getScaleCursor(handle, rotation),
  };
}

/**
 * Check if two transforms are different within tolerance.
 * Useful for deciding whether to commit a transform change.
 */
export function transformsChanged(a: Transform, b: Transform, tolerance: number = 0.01): boolean {
  return (
    Math.abs(a.x - b.x) > tolerance ||
    Math.abs(a.y - b.y) > tolerance ||
    Math.abs(a.width - b.width) > tolerance ||
    Math.abs(a.height - b.height) > tolerance ||
    Math.abs(a.rotation - b.rotation) > tolerance
  );
}
