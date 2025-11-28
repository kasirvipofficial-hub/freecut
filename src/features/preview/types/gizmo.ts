/**
 * Gizmo handle identifiers for scale operations.
 * Corners: nw, ne, se, sw
 * Edges: n, e, s, w
 */
export type GizmoHandle =
  | 'nw'
  | 'n'
  | 'ne'
  | 'e'
  | 'se'
  | 's'
  | 'sw'
  | 'w'
  | 'rotate';

/**
 * Gizmo interaction mode.
 */
export type GizmoMode = 'idle' | 'translate' | 'scale' | 'rotate';

/**
 * Transform state for gizmo operations.
 * Uses canvas coordinates (original composition size).
 */
export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation: number;
  opacity: number;
}

/**
 * Point in 2D space.
 */
export interface Point {
  x: number;
  y: number;
}

/**
 * Gizmo interaction state during drag operations.
 */
export interface GizmoState {
  /** Current interaction mode */
  mode: GizmoMode;
  /** Active scale/rotate handle (null for translate) */
  activeHandle: GizmoHandle | null;
  /** Mouse position at drag start (canvas coords) */
  startPoint: Point;
  /** Item transform at drag start */
  startTransform: Transform;
  /** Current mouse position (canvas coords) */
  currentPoint: Point;
  /** Whether shift key is held (for free resize) */
  shiftKey: boolean;
  /** Item ID being transformed */
  itemId: string;
}

/**
 * Coordinate conversion parameters.
 */
export interface CoordinateParams {
  /** Container element's bounding rectangle */
  containerRect: DOMRect;
  /** Rendered player size (after zoom) */
  playerSize: { width: number; height: number };
  /** Original project/canvas size */
  projectSize: { width: number; height: number };
  /** Current zoom level (-1 for auto-fit, or percentage) */
  zoom: number;
}
