import { create } from 'zustand';
import type { GizmoState, GizmoMode, GizmoHandle, Transform, Point } from '../types/gizmo';
import { calculateTransform } from '../utils/transform-calculations';

// IMPORTANT: Always use granular selectors to prevent unnecessary re-renders!
//
// ✅ CORRECT: Use granular selectors
// const activeGizmo = useGizmoStore(s => s.activeGizmo);
// const startTranslate = useGizmoStore(s => s.startTranslate);
//
// ❌ WRONG: Don't destructure the entire store
// const { activeGizmo, startTranslate } = useGizmoStore();

interface GizmoStoreState {
  /** Current gizmo interaction state (null when not interacting) */
  activeGizmo: GizmoState | null;
  /** Preview transform during drag (before commit) */
  previewTransform: Transform | null;
  /** Canvas dimensions for calculations */
  canvasSize: { width: number; height: number };
}

interface GizmoStoreActions {
  /** Set canvas size for coordinate calculations */
  setCanvasSize: (width: number, height: number) => void;

  /** Start translate interaction (drag to move) */
  startTranslate: (
    itemId: string,
    startPoint: Point,
    transform: Transform
  ) => void;

  /** Start scale interaction (drag handle to resize) */
  startScale: (
    itemId: string,
    handle: GizmoHandle,
    startPoint: Point,
    transform: Transform
  ) => void;

  /** Start rotate interaction (drag rotation handle) */
  startRotate: (
    itemId: string,
    startPoint: Point,
    transform: Transform
  ) => void;

  /** Update interaction with current mouse position */
  updateInteraction: (currentPoint: Point, shiftKey: boolean) => void;

  /** End interaction and return final transform (or null if cancelled) */
  endInteraction: () => Transform | null;

  /** Cancel interaction without committing changes */
  cancelInteraction: () => void;
}

export const useGizmoStore = create<GizmoStoreState & GizmoStoreActions>(
  (set, get) => ({
    // State
    activeGizmo: null,
    previewTransform: null,
    canvasSize: { width: 1920, height: 1080 },

    // Actions
    setCanvasSize: (width, height) =>
      set({ canvasSize: { width, height } }),

    startTranslate: (itemId, startPoint, transform) =>
      set({
        activeGizmo: {
          mode: 'translate',
          activeHandle: null,
          startPoint,
          startTransform: { ...transform },
          currentPoint: startPoint,
          shiftKey: false,
          itemId,
        },
        previewTransform: { ...transform },
      }),

    startScale: (itemId, handle, startPoint, transform) =>
      set({
        activeGizmo: {
          mode: 'scale',
          activeHandle: handle,
          startPoint,
          startTransform: { ...transform },
          currentPoint: startPoint,
          shiftKey: false,
          itemId,
        },
        previewTransform: { ...transform },
      }),

    startRotate: (itemId, startPoint, transform) =>
      set({
        activeGizmo: {
          mode: 'rotate',
          activeHandle: 'rotate',
          startPoint,
          startTransform: { ...transform },
          currentPoint: startPoint,
          shiftKey: false,
          itemId,
        },
        previewTransform: { ...transform },
      }),

    updateInteraction: (currentPoint, shiftKey) => {
      const { activeGizmo, canvasSize } = get();
      if (!activeGizmo) return;

      const newTransform = calculateTransform(
        activeGizmo,
        currentPoint,
        shiftKey,
        canvasSize.width,
        canvasSize.height
      );

      set({
        activeGizmo: { ...activeGizmo, currentPoint, shiftKey },
        previewTransform: newTransform,
      });
    },

    endInteraction: () => {
      const { previewTransform } = get();
      set({ activeGizmo: null, previewTransform: null });
      return previewTransform;
    },

    cancelInteraction: () =>
      set({ activeGizmo: null, previewTransform: null }),
  })
);
