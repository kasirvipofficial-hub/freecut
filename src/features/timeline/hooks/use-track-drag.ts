import { useState, useEffect, useRef, useCallback } from 'react';
import type { TimelineTrack } from '@/types/timeline';
import { useTimelineStore } from '../stores/timeline-store';
import { useSelectionStore } from '@/features/editor/stores/selection-store';
import { DRAG_THRESHOLD_PIXELS } from '../constants';

interface DragState {
  trackId: string; // Anchor track
  startTrackIndex: number;
  startMouseY: number;
  currentMouseY: number;
  draggedTracks: Array<{
    id: string;
    initialIndex: number;
  }>;
}

interface UseTrackDragReturn {
  isDragging: boolean;
  dragOffset: number;
  handleDragStart: (e: React.MouseEvent) => void;
}

/**
 * Track drag-and-drop hook for vertical reordering
 *
 * Follows the same pattern as use-timeline-drag but for vertical track reordering.
 * Supports multi-track selection and drag.
 *
 * @param track - The track to make draggable
 */
export function useTrackDrag(track: TimelineTrack): UseTrackDragReturn {
  const [isDragging, setIsDragging] = useState(false);
  const [dragOffset, setDragOffset] = useState(0);
  const dragStateRef = useRef<DragState | null>(null);

  // Get store state with granular selectors
  const tracks = useTimelineStore((s) => s.tracks);
  const setTracks = useTimelineStore((s) => s.setTracks);

  // Selection store
  const selectedTrackIds = useSelectionStore((s) => s.selectedTrackIds);
  const selectTracks = useSelectionStore((s) => s.selectTracks);
  const setDragState = useSelectionStore((s) => s.setDragState);

  // Create stable refs to avoid stale closures
  const tracksRef = useRef(tracks);
  const selectedTrackIdsRef = useRef(selectedTrackIds);
  const setTracksRef = useRef(setTracks);

  // Update refs when dependencies change
  useEffect(() => {
    tracksRef.current = tracks;
    selectedTrackIdsRef.current = selectedTrackIds;
    setTracksRef.current = setTracks;
  }, [tracks, selectedTrackIds, setTracks]);

  /**
   * Handle mouse down - start dragging
   */
  const handleDragStart = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      // Check if this track is in current selection
      const currentSelectedIds = selectedTrackIdsRef.current;
      const isInSelection = currentSelectedIds.includes(track.id);

      // If not in selection, select it
      if (!isInSelection) {
        selectTracks([track.id]);
      }

      // Determine which tracks to drag
      const tracksToDrag = isInSelection ? currentSelectedIds : [track.id];
      const allTracks = tracksRef.current;

      // Store initial state for all dragged tracks
      const draggedTracks = tracksToDrag
        .map((id) => {
          const trackIndex = allTracks.findIndex((t) => t.id === id);
          if (trackIndex === -1) return null;
          return {
            id,
            initialIndex: trackIndex,
          };
        })
        .filter((t) => t !== null) as Array<{
        id: string;
        initialIndex: number;
      }>;

      const trackIndex = allTracks.findIndex((t) => t.id === track.id);

      // Initialize drag state
      dragStateRef.current = {
        trackId: track.id,
        startTrackIndex: trackIndex,
        startMouseY: e.clientY,
        currentMouseY: e.clientY,
        draggedTracks,
      };

      // Attach a temporary mousemove listener to detect drag threshold
      const checkDragThreshold = (e: MouseEvent) => {
        if (!dragStateRef.current) return;

        const deltaY = e.clientY - dragStateRef.current.startMouseY;

        // Check if we've moved enough to start dragging
        if (Math.abs(deltaY) > DRAG_THRESHOLD_PIXELS) {
          // Start the drag
          setIsDragging(true);
          document.body.style.cursor = 'grabbing';
          document.body.style.userSelect = 'none';

          // Broadcast drag state
          const draggedIds = dragStateRef.current?.draggedTracks.map((t) => t.id) || [];
          setDragState({
            isDragging: true,
            draggedItemIds: [],
            draggedTrackIds: draggedIds,
            offset: { x: 0, y: 0 },
          });

          // Remove this listener
          window.removeEventListener('mousemove', checkDragThreshold);
          window.removeEventListener('mouseup', cancelDrag);
        }
      };

      const cancelDrag = () => {
        // Clean up if mouse released before threshold
        dragStateRef.current = null;
        window.removeEventListener('mousemove', checkDragThreshold);
        window.removeEventListener('mouseup', cancelDrag);
      };

      window.addEventListener('mousemove', checkDragThreshold);
      window.addEventListener('mouseup', cancelDrag);
    },
    [track.id, selectTracks, setDragState]
  );

  /**
   * Handle mouse move and mouse up during drag
   */
  useEffect(() => {
    if (!dragStateRef.current || !isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStateRef.current) return;

      const deltaY = e.clientY - dragStateRef.current.startMouseY;

      // Update drag offset for visual preview
      setDragOffset(deltaY);

      dragStateRef.current.currentMouseY = e.clientY;
    };

    const handleKeyDown = (e: KeyboardEvent) => {
      // Cancel drag on Escape
      if (e.key === 'Escape' && isDragging) {
        setIsDragging(false);
        setDragOffset(0);
        setDragState(null);
        dragStateRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
      }
    };

    const handleMouseUp = () => {
      if (!dragStateRef.current || !isDragging) return;

      const dragState = dragStateRef.current;
      const deltaY = dragState.currentMouseY - dragState.startMouseY;

      // Calculate new position
      const allTracks = tracksRef.current;

      // Guard against empty tracks array
      if (allTracks.length === 0) {
        setIsDragging(false);
        setDragOffset(0);
        setDragState(null);
        dragStateRef.current = null;
        document.body.style.cursor = '';
        document.body.style.userSelect = '';
        return;
      }

      // Calculate how many track positions we moved
      // Use average track height for calculation
      const avgTrackHeight = allTracks.reduce((sum, t) => sum + t.height, 0) / allTracks.length;
      const tracksMoved = Math.round(deltaY / avgTrackHeight);
      const newIndex = Math.max(0, Math.min(allTracks.length - 1, dragState.startTrackIndex + tracksMoved));

      // Only reorder if position actually changed
      if (tracksMoved !== 0) {
        // Get IDs of tracks being dragged
        const draggedIds = dragState.draggedTracks.map((t) => t.id);

        // Create new track order
        // Remove dragged tracks from current positions
        const nonDraggedTracks = allTracks.filter((t) => !draggedIds.includes(t.id));

        // Get dragged tracks in their original order (filter out any that no longer exist)
        const draggedTracksData = draggedIds
          .map((id) => allTracks.find((t) => t.id === id))
          .filter((track): track is TimelineTrack => track !== undefined);

        // Validate we still have tracks to move
        if (draggedTracksData.length === 0) {
          setIsDragging(false);
          setDragOffset(0);
          setDragState(null);
          dragStateRef.current = null;
          document.body.style.cursor = '';
          document.body.style.userSelect = '';
          return;
        }

        // Calculate correct insert index accounting for removed dragged tracks
        // Count how many dragged tracks were before the target position
        const draggedBeforeTarget = dragState.draggedTracks.filter(
          (dt) => dt.initialIndex < newIndex
        ).length;

        // Adjust insert index to account for removed tracks
        const insertIndex = Math.max(
          0,
          Math.min(newIndex - draggedBeforeTarget, nonDraggedTracks.length)
        );

        const reorderedTracks = [
          ...nonDraggedTracks.slice(0, insertIndex),
          ...draggedTracksData,
          ...nonDraggedTracks.slice(insertIndex),
        ];

        // Update order property for all tracks
        const tracksWithOrder = reorderedTracks.map((t, index) => ({
          ...t,
          order: index,
        }));

        // Apply reorder (this creates an undo snapshot via Zundo)
        setTracksRef.current(tracksWithOrder);
      }

      // Clean up
      setIsDragging(false);
      setDragOffset(0);
      setDragState(null);
      dragStateRef.current = null;
      document.body.style.cursor = '';
      document.body.style.userSelect = '';
    };

    if (dragStateRef.current) {
      window.addEventListener('mousemove', handleMouseMove);
      window.addEventListener('mouseup', handleMouseUp);
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        window.removeEventListener('mousemove', handleMouseMove);
        window.removeEventListener('mouseup', handleMouseUp);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, [isDragging, setDragState]);

  return {
    isDragging,
    dragOffset,
    handleDragStart,
  };
}
