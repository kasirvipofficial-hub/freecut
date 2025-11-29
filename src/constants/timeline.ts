// =============================================================================
// TRACK & CLIP DIMENSIONS
// =============================================================================
// Change DEFAULT_TRACK_HEIGHT and all other dimensions will adjust automatically

export const DEFAULT_TRACK_HEIGHT = 64;
export const MIN_TRACK_HEIGHT = 40;
export const MAX_TRACK_HEIGHT = 200;

// Clip fills entire track height (selection ring is inset)
export const CLIP_HEIGHT = DEFAULT_TRACK_HEIGHT;

// -----------------------------------------------------------------------------
// Shared clip layout
// -----------------------------------------------------------------------------
export const CLIP_LABEL_HEIGHT = 16; // Shared label height for video & audio

// -----------------------------------------------------------------------------
// Video clip layout (2 rows: filmstrip with overlayed label | waveform)
// -----------------------------------------------------------------------------
export const VIDEO_WAVEFORM_HEIGHT = 20;
export const VIDEO_FILMSTRIP_HEIGHT = CLIP_HEIGHT - VIDEO_WAVEFORM_HEIGHT; // 44px

// -----------------------------------------------------------------------------
// Audio clip layout (2 rows: label | waveform)
// -----------------------------------------------------------------------------
export const AUDIO_WAVEFORM_HEIGHT = CLIP_HEIGHT - CLIP_LABEL_HEIGHT; // 48px

// -----------------------------------------------------------------------------
// Filmstrip thumbnail dimensions (matches filmstrip row, 16:9 aspect ratio)
// -----------------------------------------------------------------------------
export const THUMBNAIL_HEIGHT = VIDEO_FILMSTRIP_HEIGHT;
export const THUMBNAIL_WIDTH = Math.round(THUMBNAIL_HEIGHT * (16 / 9)); // 50px

// =============================================================================
// ZOOM & NAVIGATION
// =============================================================================

export const DEFAULT_ZOOM_LEVEL = 1;
export const MIN_ZOOM_LEVEL = 0.01;
export const MAX_ZOOM_LEVEL = 10;

export const SNAP_THRESHOLD = 5;
export const DEFAULT_FPS = 30;
