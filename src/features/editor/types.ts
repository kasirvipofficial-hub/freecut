export interface EditorState {
  activePanel: 'media' | 'effects' | 'properties' | null;
  sidebarWidth: number;
  timelineHeight: number;
}

export interface EditorActions {
  setActivePanel: (panel: 'media' | 'effects' | 'properties' | null) => void;
  setSidebarWidth: (width: number) => void;
  setTimelineHeight: (height: number) => void;
}

export interface SelectionState {
  selectedClipIds: string[];
  selectedTrackId: string | null;
  selectionType: 'clip' | 'track' | null;
}

export interface SelectionActions {
  selectClips: (ids: string[]) => void;
  selectTrack: (id: string | null) => void;
  clearSelection: () => void;
}
