/**
 * Configuration constants for keystroke and content tracking
 */

// Content snapshot tracking interval in milliseconds
// This controls how often content snapshots are taken during coding sessions
export const CONTENT_SNAPSHOT_INTERVAL = 1000; // 1 second

// Minimum content change threshold to trigger a snapshot
// Only create snapshots if content has changed by at least this many characters
export const MIN_CONTENT_CHANGE_THRESHOLD = 1;

// Auto-save interval for content and events (in milliseconds)
export const AUTO_SAVE_INTERVAL = 5000; // 5 seconds

// Typing indicator timeout (in milliseconds)
// How long to show "typing..." indicator after last keystroke
export const TYPING_INDICATOR_TIMEOUT = 2000; // 2 seconds

// Playback settings
export const PLAYBACK_SETTINGS = {
  // Default playback speeds available
  SPEED_OPTIONS: [0.25, 0.5, 1, 2, 4, 8],
  // Default playback speed
  DEFAULT_SPEED: 1,
  // Playback update interval (in milliseconds)
  UPDATE_INTERVAL: 50, // 50ms for smooth playback
} as const;

// Event buffer settings
export const EVENT_BUFFER = {
  // Maximum number of events to buffer before forcing a save
  MAX_SIZE: 100,
  // Maximum time to buffer events before forcing a save (in milliseconds)
  MAX_TIME: 10000, // 10 seconds
} as const;
