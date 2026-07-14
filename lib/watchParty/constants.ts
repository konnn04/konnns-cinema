// All tunable Watch Party numbers/limits live here, separate from the data
// shapes (types.ts) and the Firebase read/write logic (hooks/useWatchParty.tsx),
// so timings/limits can be adjusted without hunting through the feature.

// Chat & nickname
export const MAX_CHAT_LEN = 512;
export const MAX_NICKNAME_LEN = 100;
export const CHAT_COOLDOWN_MS = 5000;
export const CHAT_RETENTION_MS = 60 * 60 * 1000;
export const MAX_CHAT_MESSAGES = 300;

// Room lifecycle. There's no always-on server to run timers, so these are
// enforced lazily/client-side: the empty-room grace is checked by whichever
// client next tries to create/join that room code, and the host grace is
// checked by a watchdog interval any connected member runs (see
// hooks/useWatchParty.tsx) -- the first one to notice performs the RTDB
// transaction, guarded by Firebase security rules.
export const EMPTY_ROOM_GRACE_MS = 60000;
export const HOST_RECONNECT_GRACE_MS = 60000;
export const HOST_WATCHDOG_INTERVAL_MS = 15000;
export const EPISODE_CHANGE_DECISION_WINDOW_MS = 30000;

// Reactions
export const REACTION_ICONS = ['heart', 'laugh', 'angry', 'thumbsup', 'party'] as const;
export type ReactionIcon = (typeof REACTION_ICONS)[number];
export const FLOATING_EVENT_LIFETIME_MS = 6000;
export const REACTION_TTL_MS = 4000;

// Playback sync
export const PLAYBACK_HEARTBEAT_MS = 4000;
export const PLAYBACK_DRIFT_THRESHOLD_SECONDS = 2;

// Firebase Realtime Database layout. Room creation retries a fresh code on
// collision, capped so a pathological run of collisions can't loop forever.
export const ROOMS_PATH = 'watchPartyRooms';
export const UID_TO_ROOM_PATH = 'watchPartyUidToRoom';
export const CREATE_ROOM_MAX_ATTEMPTS = 5;

export const WATCH_PARTY_ERROR_CODES = {
  ROOM_NOT_FOUND: 'room_not_found',
  CHAT_COOLDOWN: 'chat_cooldown',
  CREATE_FAILED: 'create_failed',
  GENERIC: 'generic',
} as const;

// Danmaku (floating chat) overlay -- lanes are hashed from the message id
// (see components/watchparty/FloatingComments.tsx) so concurrent messages
// spread out instead of stacking on the same line.
export const CHAT_LANE_COUNT = 6;
export const CHAT_LANE_BASE_OFFSET_PERCENT = 8;
export const CHAT_LANE_SPACING_PERCENT = 12;
export const CHAT_SCROLL_DURATION_SECONDS = 9;

// Floating reactions (Facebook-Live style rise-and-fade).
export const REACTION_SPREAD_MIN_PERCENT = 10;
export const REACTION_SPREAD_RANGE_PERCENT = 70;
export const REACTION_RISE_DISTANCE_PX = 220;
export const REACTION_SCALE_START = 0.6;
export const REACTION_SCALE_END = 1.1;
export const REACTION_ANIMATION_DURATION_SECONDS = 3;

// UI feedback timings
export const CHAT_COOLDOWN_TICK_MS = 250;
export const COPY_FEEDBACK_MS = 2000;
