import { useTimelineStore } from '../stores/timeline-store';

export function useTimelineHistory() {
  const undo = () => useTimelineStore.temporal.getState().undo();
  const redo = () => useTimelineStore.temporal.getState().redo();
  const canUndo = useTimelineStore((state) => !!state.pastStates?.length);
  const canRedo = useTimelineStore((state) => !!state.futureStates?.length);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
  };
}
