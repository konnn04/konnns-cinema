import { ref, set, onValue, remove, onDisconnect, type Unsubscribe } from 'firebase/database';
import { db } from '@/lib/firebase/client';
import type { PlaybackState, RemoteCommand } from './types';

export function publishPlayerState(sessionId: string, state: PlaybackState): void {
  if (!db || !sessionId) return;
  const stateRef = ref(db, `remote/${sessionId}/state`);
  set(stateRef, {
    sessionId: state.sessionId,
    movieTitle: state.movieTitle || '',
    episodeName: state.episodeName || '',
    isPlaying: state.isPlaying,
    currentTime: Math.round(state.currentTime * 10) / 10,
    duration: Math.round(state.duration),
    volume: state.volume,
    isMuted: state.isMuted,
    lastUpdated: Date.now(),
  }).catch((err) => console.warn('Firebase remote: state publish error:', err));
}

export function subscribeToPlayerState(
  sessionId: string,
  onState: (state: PlaybackState) => void
): Unsubscribe {
  if (!db || !sessionId) return () => { };
  const stateRef = ref(db, `remote/${sessionId}/state`);
  return onValue(stateRef, (snapshot) => {
    if (snapshot.exists()) {
      onState(snapshot.val() as PlaybackState);
    }
  });
}

export function sendRemoteCommand(
  sessionId: string,
  action: RemoteCommand['action'],
  value?: number
): void {
  if (!db || !sessionId) return;
  const cmdRef = ref(db, `remote/${sessionId}/command`);
  const cmd: RemoteCommand = {
    id: Math.random().toString(36).substring(2, 9),
    action,
    value,
    timestamp: Date.now(),
  };
  set(cmdRef, cmd).catch((err) => console.warn('Firebase remote: command send error:', err));
}

/**
 * Subscribes to remote commands on the PC/TV player.
 * Fires instantly (< 50ms) as soon as the phone sends a command.
 */
export function subscribeToRemoteCommands(
  sessionId: string,
  onCommand: (cmd: RemoteCommand) => void
): Unsubscribe {
  if (!db || !sessionId) return () => { };
  const cmdRef = ref(db, `remote/${sessionId}/command`);
  let initial = true;
  return onValue(cmdRef, (snapshot) => {
    if (initial) {
      initial = false;
      return; // Ignore stale initial snapshot
    }
    if (snapshot.exists()) {
      onCommand(snapshot.val() as RemoteCommand);
    }
  });
}

/**
 * Automatically cleans up the remote session when the player closes or disconnects.
 */
export function setupSessionLifecycle(sessionId: string): void {
  if (!db || !sessionId) return;
  const sessionRef = ref(db, `remote/${sessionId}`);
  try {
    onDisconnect(sessionRef).remove().catch(() => { });
  } catch { }
}

export function removeSession(sessionId: string): void {
  if (!db || !sessionId) return;
  const sessionRef = ref(db, `remote/${sessionId}`);
  remove(sessionRef).catch(() => { });
}
