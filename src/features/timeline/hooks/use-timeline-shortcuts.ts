export interface TimelineShortcutCallbacks {
  onPlay?: () => void;
  onPause?: () => void;
  onSplit?: () => void;
  onDelete?: () => void;
  onUndo?: () => void;
  onRedo?: () => void;
}

export function useTimelineShortcuts(callbacks: TimelineShortcutCallbacks) {
  // TODO: Implement timeline keyboard shortcuts
}
