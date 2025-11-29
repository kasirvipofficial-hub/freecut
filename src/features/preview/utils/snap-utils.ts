import type { Transform } from '../types/gizmo';

/** Snap threshold in canvas pixels */
const SNAP_THRESHOLD = 8;

/** Snap line type for visual feedback */
export interface SnapLine {
  type: 'horizontal' | 'vertical';
  position: number; // Canvas coordinate
  label?: string;
}

/** Result of snap calculation */
export interface SnapResult {
  transform: Transform;
  snapLines: SnapLine[];
}

/**
 * Calculate canvas snap points for translate operations.
 * Only includes edges and center to reduce visual noise.
 */
function getTranslateSnapPoints(canvasWidth: number, canvasHeight: number) {
  return {
    vertical: [
      { pos: 0, label: 'Edge' },
      { pos: canvasWidth * 0.5, label: '50%' },
      { pos: canvasWidth, label: 'Edge' },
    ],
    horizontal: [
      { pos: 0, label: 'Edge' },
      { pos: canvasHeight * 0.5, label: '50%' },
      { pos: canvasHeight, label: 'Edge' },
    ],
  };
}

/**
 * Calculate canvas snap points for scale operations.
 * Includes edges and percentage-based positions.
 */
function getScaleSnapPoints(canvasWidth: number, canvasHeight: number) {
  return {
    vertical: [
      { pos: 0, label: '0%' },
      { pos: canvasWidth * 0.25, label: '25%' },
      { pos: canvasWidth * 0.5, label: '50%' },
      { pos: canvasWidth * 0.75, label: '75%' },
      { pos: canvasWidth, label: '100%' },
    ],
    horizontal: [
      { pos: 0, label: '0%' },
      { pos: canvasHeight * 0.25, label: '25%' },
      { pos: canvasHeight * 0.5, label: '50%' },
      { pos: canvasHeight * 0.75, label: '75%' },
      { pos: canvasHeight, label: '100%' },
    ],
  };
}

/**
 * Get item edges and center in canvas coordinates.
 * Transform x/y is offset from canvas center.
 */
function getItemBounds(transform: Transform, canvasWidth: number, canvasHeight: number) {
  const centerX = canvasWidth / 2 + transform.x;
  const centerY = canvasHeight / 2 + transform.y;

  return {
    left: centerX - transform.width / 2,
    right: centerX + transform.width / 2,
    top: centerY - transform.height / 2,
    bottom: centerY + transform.height / 2,
    centerX,
    centerY,
  };
}

/**
 * Apply snapping to a transform during drag operations.
 * Snaps item edges and center to canvas snap points.
 */
export function applySnapping(
  transform: Transform,
  canvasWidth: number,
  canvasHeight: number,
  enabled: boolean = true
): SnapResult {
  if (!enabled) {
    return { transform, snapLines: [] };
  }

  const snapPoints = getTranslateSnapPoints(canvasWidth, canvasHeight);
  const bounds = getItemBounds(transform, canvasWidth, canvasHeight);
  const snapLines: SnapLine[] = [];

  let deltaX = 0;
  let deltaY = 0;

  // Check vertical snap points (for horizontal position)
  // Try to snap left edge, center, or right edge
  const xEdges = [
    { edge: bounds.left, type: 'left' },
    { edge: bounds.centerX, type: 'center' },
    { edge: bounds.right, type: 'right' },
  ];

  for (const snapPoint of snapPoints.vertical) {
    for (const { edge, type } of xEdges) {
      const distance = Math.abs(edge - snapPoint.pos);
      if (distance < SNAP_THRESHOLD) {
        // Calculate offset needed to snap
        const snapDelta = snapPoint.pos - edge;
        // Only snap if this is closer than current snap
        if (deltaX === 0 || Math.abs(snapDelta) < Math.abs(deltaX)) {
          deltaX = snapDelta;
          // Add snap line
          const existingLine = snapLines.find(
            (l) => l.type === 'vertical' && l.position === snapPoint.pos
          );
          if (!existingLine) {
            snapLines.push({
              type: 'vertical',
              position: snapPoint.pos,
              label: snapPoint.label,
            });
          }
        }
        break; // Found snap for this edge, move to next snap point
      }
    }
  }

  // Check horizontal snap points (for vertical position)
  // Try to snap top edge, center, or bottom edge
  const yEdges = [
    { edge: bounds.top, type: 'top' },
    { edge: bounds.centerY, type: 'center' },
    { edge: bounds.bottom, type: 'bottom' },
  ];

  for (const snapPoint of snapPoints.horizontal) {
    for (const { edge, type } of yEdges) {
      const distance = Math.abs(edge - snapPoint.pos);
      if (distance < SNAP_THRESHOLD) {
        const snapDelta = snapPoint.pos - edge;
        if (deltaY === 0 || Math.abs(snapDelta) < Math.abs(deltaY)) {
          deltaY = snapDelta;
          const existingLine = snapLines.find(
            (l) => l.type === 'horizontal' && l.position === snapPoint.pos
          );
          if (!existingLine) {
            snapLines.push({
              type: 'horizontal',
              position: snapPoint.pos,
              label: snapPoint.label,
            });
          }
        }
        break;
      }
    }
  }

  // Apply snap deltas to transform
  // Since transform.x/y is offset from center, we just add the delta
  const snappedTransform: Transform = {
    ...transform,
    x: transform.x + deltaX,
    y: transform.y + deltaY,
  };

  return {
    transform: snappedTransform,
    snapLines,
  };
}

/**
 * Apply snapping during scale operations.
 * Snaps item edges to canvas snap points while maintaining aspect ratio.
 * Uses uniform scaling to prevent visual distortion.
 * Shows all 4 edge lines when at 100% scale (or other symmetric positions).
 */
export function applyScaleSnapping(
  transform: Transform,
  canvasWidth: number,
  canvasHeight: number,
  enabled: boolean = true
): SnapResult {
  if (!enabled) {
    return { transform, snapLines: [] };
  }

  const snapPoints = getScaleSnapPoints(canvasWidth, canvasHeight);
  const bounds = getItemBounds(transform, canvasWidth, canvasHeight);
  const snapLines: SnapLine[] = [];
  const aspectRatio = transform.width / transform.height;

  // Find the best snap (closest edge to a snap point)
  let bestSnap: {
    type: 'width' | 'height';
    newValue: number;
    distance: number;
    snapLine: SnapLine;
  } | null = null;

  // Check vertical snap points (affects width via left/right edges)
  for (const snapPoint of snapPoints.vertical) {
    // Check left edge
    const leftDist = Math.abs(bounds.left - snapPoint.pos);
    if (leftDist < SNAP_THRESHOLD) {
      const halfWidth = bounds.centerX - snapPoint.pos;
      const newWidth = halfWidth * 2;
      if (!bestSnap || leftDist < bestSnap.distance) {
        bestSnap = {
          type: 'width',
          newValue: newWidth,
          distance: leftDist,
          snapLine: { type: 'vertical', position: snapPoint.pos, label: snapPoint.label },
        };
      }
    }

    // Check right edge
    const rightDist = Math.abs(bounds.right - snapPoint.pos);
    if (rightDist < SNAP_THRESHOLD) {
      const halfWidth = snapPoint.pos - bounds.centerX;
      const newWidth = halfWidth * 2;
      if (!bestSnap || rightDist < bestSnap.distance) {
        bestSnap = {
          type: 'width',
          newValue: newWidth,
          distance: rightDist,
          snapLine: { type: 'vertical', position: snapPoint.pos, label: snapPoint.label },
        };
      }
    }
  }

  // Check horizontal snap points (affects height via top/bottom edges)
  for (const snapPoint of snapPoints.horizontal) {
    // Check top edge
    const topDist = Math.abs(bounds.top - snapPoint.pos);
    if (topDist < SNAP_THRESHOLD) {
      const halfHeight = bounds.centerY - snapPoint.pos;
      const newHeight = halfHeight * 2;
      if (!bestSnap || topDist < bestSnap.distance) {
        bestSnap = {
          type: 'height',
          newValue: newHeight,
          distance: topDist,
          snapLine: { type: 'horizontal', position: snapPoint.pos, label: snapPoint.label },
        };
      }
    }

    // Check bottom edge
    const bottomDist = Math.abs(bounds.bottom - snapPoint.pos);
    if (bottomDist < SNAP_THRESHOLD) {
      const halfHeight = snapPoint.pos - bounds.centerY;
      const newHeight = halfHeight * 2;
      if (!bestSnap || bottomDist < bestSnap.distance) {
        bestSnap = {
          type: 'height',
          newValue: newHeight,
          distance: bottomDist,
          snapLine: { type: 'horizontal', position: snapPoint.pos, label: snapPoint.label },
        };
      }
    }
  }

  // If no snap found, return original transform
  if (!bestSnap) {
    return { transform, snapLines: [] };
  }

  // Apply snap while maintaining aspect ratio (uniform scale)
  let newWidth: number;
  let newHeight: number;

  if (bestSnap.type === 'width') {
    newWidth = bestSnap.newValue;
    newHeight = newWidth / aspectRatio;
  } else {
    newHeight = bestSnap.newValue;
    newWidth = newHeight * aspectRatio;
  }

  // Calculate snapped bounds to check for symmetric edge alignment
  const snappedBounds = {
    left: bounds.centerX - newWidth / 2,
    right: bounds.centerX + newWidth / 2,
    top: bounds.centerY - newHeight / 2,
    bottom: bounds.centerY + newHeight / 2,
  };

  // Check if all 4 edges align with snap points (e.g., 100% scale)
  // Show all aligned edges for visual confirmation
  const edgeTolerance = 1; // 1px tolerance for "aligned"

  for (const snapPoint of snapPoints.vertical) {
    if (Math.abs(snappedBounds.left - snapPoint.pos) < edgeTolerance) {
      snapLines.push({ type: 'vertical', position: snapPoint.pos, label: snapPoint.label });
    }
    if (Math.abs(snappedBounds.right - snapPoint.pos) < edgeTolerance) {
      snapLines.push({ type: 'vertical', position: snapPoint.pos, label: snapPoint.label });
    }
  }

  for (const snapPoint of snapPoints.horizontal) {
    if (Math.abs(snappedBounds.top - snapPoint.pos) < edgeTolerance) {
      snapLines.push({ type: 'horizontal', position: snapPoint.pos, label: snapPoint.label });
    }
    if (Math.abs(snappedBounds.bottom - snapPoint.pos) < edgeTolerance) {
      snapLines.push({ type: 'horizontal', position: snapPoint.pos, label: snapPoint.label });
    }
  }

  const snappedTransform: Transform = {
    ...transform,
    width: Math.max(20, newWidth),
    height: Math.max(20, newHeight),
  };

  return {
    transform: snappedTransform,
    snapLines,
  };
}
