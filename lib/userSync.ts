import { ref, get, set, remove } from 'firebase/database';
import { db } from '@/lib/firebase/client';
import type { WatchHistoryItem } from '@/lib/stores/useWatchHistoryStore';

const USERS_PATH = 'users';

export interface SyncedPrefs {
  favoriteGenres: string[];
  playerDefaultSpeed: number;
  playerAutoNext: boolean;
  playerImageEnhance: boolean;
  onboardingCompleted: boolean;
}

export async function pullCloudHistory(uid: string): Promise<WatchHistoryItem[]> {
  const snap = await get(ref(db, `${USERS_PATH}/${uid}/history`));
  const val = snap.val() as Record<string, WatchHistoryItem> | null;
  return val ? Object.values(val) : [];
}

export async function pushCloudHistory(uid: string, history: WatchHistoryItem[]): Promise<void> {
  const payload: Record<string, WatchHistoryItem> = {};
  for (const item of history) payload[item.slug] = item;
  await set(ref(db, `${USERS_PATH}/${uid}/history`), payload);
}

export async function deleteCloudHistory(uid: string): Promise<void> {
  await remove(ref(db, `${USERS_PATH}/${uid}/history`));
}

export async function pullCloudPrefs(uid: string): Promise<Partial<SyncedPrefs> | null> {
  const snap = await get(ref(db, `${USERS_PATH}/${uid}/prefs`));
  return (snap.val() as Partial<SyncedPrefs> | null) ?? null;
}

export async function pushCloudPrefs(uid: string, prefs: SyncedPrefs): Promise<void> {
  await set(ref(db, `${USERS_PATH}/${uid}/prefs`), prefs);
}
