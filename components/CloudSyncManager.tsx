'use client';

import { useEffect, useRef } from 'react';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useWatchHistoryStore } from '@/lib/stores/useWatchHistoryStore';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import { pullCloudHistory, pushCloudHistory, pullCloudPrefs, pushCloudPrefs } from '@/lib/userSync';

function flush(uid: string) {
  const history = useWatchHistoryStore.getState().history;
  const prefs = usePreferencesStore.getState();
  pushCloudHistory(uid, history).catch(() => {});
  pushCloudPrefs(uid, {
    favoriteGenres: prefs.favoriteGenres,
    playerDefaultSpeed: prefs.playerDefaultSpeed,
    playerAutoNext: prefs.playerAutoNext,
    playerImageEnhance: prefs.playerImageEnhance,
    onboardingCompleted: prefs.onboardingCompleted,
  }).catch(() => {});
}

export default function CloudSyncManager() {
  const uid = useAuthStore((s) => (s.user && !s.user.isAnonymous ? s.user.uid : null));
  const pulledForUidRef = useRef<string | null>(null);

  useEffect(() => {
    if (!uid || pulledForUidRef.current === uid) return;
    pulledForUidRef.current = uid;

    (async () => {
      const [cloudHistory, cloudPrefs] = await Promise.all([pullCloudHistory(uid), pullCloudPrefs(uid)]);

      const merged = new Map(useWatchHistoryStore.getState().history.map((h) => [h.slug, h]));
      for (const item of cloudHistory) {
        const existing = merged.get(item.slug);
        if (!existing || new Date(item.updatedAt).getTime() > new Date(existing.updatedAt).getTime()) {
          merged.set(item.slug, item);
        }
      }
      useWatchHistoryStore.setState({ history: Array.from(merged.values()) });

      if (cloudPrefs) usePreferencesStore.setState((state) => ({ ...state, ...cloudPrefs }));
    })();
  }, [uid]);

  useEffect(() => {
    if (!uid) return;

    const handleFlush = () => flush(uid);
    const handleVisibility = () => { if (document.visibilityState === 'hidden') flush(uid); };
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('pagehide', handleFlush);

    return () => {
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('pagehide', handleFlush);
      flush(uid);
    };
  }, [uid]);

  return null;
}
