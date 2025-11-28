import type { GizmoState, GizmoHandle, Transform, Point } from '../types/gizmo';
import { rotatePoint, getAngleFromCenter } from './coordinate-transform';

const MIN_SIZE = 20;

/**
 * Calculate new transform based on current gizmo interaction.
 */
export function calculateTransform(
  gizmo: GizmoState,
  currentPoint: Point,
  shiftKey: boolean,
  canvasWidth: number,
  canvasHeight: number
): Transform {
  switch (gizmo.mode) {
    case 'translate':
      return calculateTranslation(gizmo.startTransform, gizmo.startPoint, currentPoint);
    case 'scale':
      return calculateScale(
        gizmo.startTransform,
        gizmo.activeHandle!,
        gizmo.startPoint,
        currentPoint,
        !shiftKey, // Locked aspect ratio when shift NOT pressed
        canvasWidth,
        canvasHeight
      );
    case 'rotate':
      return calculateRotation(
        gizmo.startTransform,
        gizmo.startPoint,
        currentPoint,
        canvasWidth,
        canvasHeight
      );
    default:
      return gizmo.startTransform;
  }
}

/**
 * Calculate translation (drag to move).
 */
function calculateTranslation(
  start: Transform,
  startPoint: Point,
  currentPoint: Point
): Transform {
  return {
    ...start,
    x: start.x + (currentPoint.x - startPoint.x),
    y: start.y + (currentPoint.y - startPoint.y),
  };
}

/**
 * Calculate scale based on handle drag.
 * Handles maintain aspect ratio unless shift is held.
 */
function calculateScale(
  start: Transform,
  handle: GizmoHandle,
  startPoint: Point,
  currentPoint: Point,
  maintainAspectRatio: boolean,
  canvasWidth: number,
  canvasHeight: number
): Transform {
  // Get center of the item in canvas coordinates
  const centerX = canvasWidth / 2 + start.x;
  const centerY = canvasHeight / 2 + start.y;
  const center: Point = { x: centerX, y: centerY };

  // Work in local (unrotated) space for scale calculations
  const localStart = rotatePoint(startPoint, center, -start.rotation);
  const localCurrent = rotatePoint(currentPoint, center, -start.rotation);

  const dx = localCurrent.x - localStart.x;
  const dy = localCurrent.y - localStart.y;

  let newWidth = start.width;
  let newHeight = start.height;
  let newX = start.x;
  let newY = start.y;

  // Determine which edges are affected
  const affectsLeft = handle.includes('w');
  const affectsRight = handle.includes('e');
  const affectsTop = handle.includes('n');
  const affectsBottom = handle.includes('s');

  // Calculate new dimensions based on handle
  if (affectsRight) {
    newWidth = Math.max(MIN_SIZE, start.width + dx);
  }
  if (affectsLeft) {
    const widthDelta = -dx;
    newWidth = Math.max(MIN_SIZE, start.width + widthDelta);
    // Adjust position to keep right edge fixed
    newX = start.x - (newWidth - start.width) / 2;
  }
  if (affectsBottom) {
    newHeight = Math.max(MIN_SIZE, start.height + dy);
  }
  if (affectsTop) {
    const heightDelta = -dy;
    newHeight = Math.max(MIN_SIZE, start.height + heightDelta);
    // Adjust position to keep bottom edge fixed
    newY = start.y - (newHeight - start.height) / 2;
  }

  // Maintain aspect ratio for corner handles
  if (maintainAspectRatio && (affectsLeft || affectsRight) && (affectsTop || affectsBottom)) {
    const aspectRatio = start.width / start.height;
    const widthFromHeight = newHeight * aspectRatio;
    const heightFromWidth = newWidth / aspectRatio;

    // Use the dimension that changed more
    const widthChange = Math.abs(newWidth - start.width);
    const heightChange = Math.abs(newHeight - start.height);

    if (widthChange > heightChange) {
      // Width changed more, adjust height
      const oldHeight = newHeight;
      newHeight = heightFromWidth;
      // Adjust Y position for the height change
      if (affectsTop) {
        newY = start.y - (newHeight - start.height) / 2;
      }
    } else {
      // Height changed more, adjust width
      const oldWidth = newWidth;
      newWidth = widthFromHeight;
      // Adjust X position for the width change
      if (affectsLeft) {
        newX = start.x - (newWidth - start.width) / 2;
      }
    }
  }

  // For edge handles (n, s, e, w), maintain aspect ratio if enabled
  if (maintainAspectRatio && !((affectsLeft || affectsRight) && (affectsTop || affectsBottom))) {
    const aspectRatio = start.width / start.height;
    if (affectsLeft || affectsRight) {
      // Horizontal edge: adjust height
      newHeight = newWidth / aspectRatio;
    } else {
      // Vertical edge: adjust width
      newWidth = newHeight * aspectRatio;
    }
  }

  return {
    ...start,
    x: newX,
    y: newY,
    width: newWidth,
    height: newHeight,
  };
}

/**
 * Calculate rotation based on drag around center.
 */
function calculateRotation(
  start: Transform,
  startPoint: Point,
  currentPoint: Point,
  canvasWidth: number,
  canvasHeight: number
): Transform {
  // Get center in canvas coordinates
  const centerX = canvasWidth / 2 + start.x;
  const centerY = canvasHeight / 2 + start.y;
  const center: Point = { x: centerX, y: centerY };

  // Calculate angle change
  const startAngle = getAngleFromCenter(startPoint, center);
  const currentAngle = getAngleFromCenter(currentPoint, center);
  const deltaAngle = currentAngle - startAngle;

  // Normalize rotation to -180 to 180 range
  let newRotation = start.rotation + deltaAngle;
  while (newRotation > 180) newRotation -= 360;
  while (newRotation < -180) newRotation += 360;

  return {
    ...start,
    rotation: newRotation,
  };
}

/**
 * Get default transform for an item (fit to canvas, centered).
 */
export function getDefaultTransform(
  canvasWidth: number,
  canvasHeight: number,
  sourceWidth?: number,
  sourceHeight?: number
): Transform {
  const srcWidth = sourceWidth ?? canvasWidth;
  const srcHeight = sourceHeight ?? canvasHeight;

  // Fit to canvas
  const scaleX = canvasWidth / srcWidth;
  const scaleY = canvasHeight / srcHeight;
  const scale = Math.min(scaleX, scaleY);

  return {
    x: 0,
    y: 0,
    width: srcWidth * scale,
    height: srcHeight * scale,
    rotation: 0,
    opacity: 1,
  };
}
