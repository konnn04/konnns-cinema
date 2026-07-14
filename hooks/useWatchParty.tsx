'use client';

import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import {
  ref, get, set, update, remove, onValue, runTransaction, onDisconnect, push, serverTimestamp,
  type Unsubscribe,
} from 'firebase/database';
import { auth, db, ensureAnonymousAuth } from '@/lib/firebase/client';
import { useLanguage } from '@/hooks/useLanguage';
import { toast } from '@/lib/toast';
import { useAuthStore } from '@/lib/stores/useAuthStore';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';
import { generateRoomCode, normalizeRoomCode } from '@/lib/watchParty/roomCode';
import {
  CHAT_COOLDOWN_MS, CHAT_RETENTION_MS, CREATE_ROOM_MAX_ATTEMPTS, EMPTY_ROOM_GRACE_MS,
  EPISODE_CHANGE_DECISION_WINDOW_MS, FLOATING_EVENT_LIFETIME_MS, HOST_RECONNECT_GRACE_MS,
  HOST_WATCHDOG_INTERVAL_MS, MAX_CHAT_LEN, MAX_NICKNAME_LEN, REACTION_TTL_MS, ROOMS_PATH,
  UID_TO_ROOM_PATH, WATCH_PARTY_ERROR_CODES, type ReactionIcon,
} from '@/lib/watchParty/constants';
import type { ChatMessage, EpisodeChange, Room, RoomMember } from '@/lib/watchParty/types';

interface WatchPartyActions {
  createRoom: (movieSlug: string, episodeSlug: string, nickname: string) => void;
  joinRoom: (code: string, nickname: string) => void;
  leaveRoom: () => void;
  setNickname: (nickname: string) => void;
  setAllowMemberControl: (value: boolean) => void;
  updatePlayback: (isPlaying: boolean, currentTime: number) => void;
  changeEpisode: (movieSlug: string, episodeSlug: string) => void;
  decideEpisodeChange: (accept: boolean) => void;
  sendChat: (text: string) => void;
  sendReaction: (icon: ReactionIcon) => void;
  transferHost: (targetUid: string) => void;
}

const WatchPartyContext = createContext<WatchPartyActions | undefined>(undefined);

function sanitizeNickname(raw: string): string {
  return raw.trim().slice(0, MAX_NICKNAME_LEN);
}

function isVerified(): boolean {
  return !!auth.currentUser && !auth.currentUser.isAnonymous;
}

function isStaleEmptyRoom(room: Room, now: number): boolean {
  return room.emptySince !== null && now - room.emptySince > EMPTY_ROOM_GRACE_MS;
}

// Background/reconciliation writes (watchdog, presence, leave cleanup) can
// legitimately get rejected by security rules under normal operation -- e.g.
// two clients' watchdogs racing to reassign host, or the host reconnecting
// the instant before a stale-host transaction commits. That's an expected
// outcome, not a bug, so these fail silently (logged, not surfaced to the
// user) rather than crashing as an unhandled rejection.
function swallow(context: string) {
  return (err: unknown) => console.warn(`Watch Party: ${context} failed (non-fatal):`, err);
}

// Reassigns hostUid via a narrow transaction scoped to just that field --
// this (not a whole-room transaction) is what the security rules authorize,
// since rules can validate "the caller IS the current host" or "the current
// host has been offline past the grace period" against a single small value.
// Returning `undefined` (not the unchanged value) aborts the transaction
// without attempting a write at all when the precondition doesn't hold --
// otherwise even a same-value "no-op" write still gets rules-evaluated and
// can throw permission_denied.
async function reassignHost(code: string, fromUid: string, toUid: string): Promise<void> {
  const hostUidRef = ref(db, `${ROOMS_PATH}/${code}/hostUid`);
  await runTransaction(hostUidRef, (current) => (current === fromUid ? toUid : undefined)).catch(swallow('host reassignment'));
}

async function leaveRoomInternal(code: string, uid: string): Promise<void> {
  const roomRef = ref(db, `${ROOMS_PATH}/${code}`);
  const [membersSnap, hostUidSnap] = await Promise.all([
    get(ref(db, `${ROOMS_PATH}/${code}/members`)).catch(() => null),
    get(ref(db, `${ROOMS_PATH}/${code}/hostUid`)).catch(() => null),
  ]);
  const members = (membersSnap?.val() || {}) as Record<string, RoomMember>;
  const wasHost = hostUidSnap?.val() === uid;
  delete members[uid];
  const remaining = Object.entries(members);

  await remove(ref(db, `${ROOMS_PATH}/${code}/members/${uid}`)).catch(swallow('leave: remove member'));

  if (remaining.length === 0) {
    await update(roomRef, { emptySince: Date.now() }).catch(swallow('leave: mark empty'));
  } else {
    await update(roomRef, { emptySince: null }).catch(swallow('leave: clear empty'));
    if (wasHost) {
      const next = remaining.sort((a, b) => a[1].joinedAt - b[1].joinedAt)[0];
      await reassignHost(code, uid, next[0]);
    }
  }
  await remove(ref(db, `${UID_TO_ROOM_PATH}/${uid}`)).catch(swallow('leave: clear uid mapping'));
}

async function leaveCurrentRoomIfAny(uid: string): Promise<void> {
  const mappingSnap = await get(ref(db, `${UID_TO_ROOM_PATH}/${uid}`)).catch(() => null);
  const existingCode = mappingSnap?.val() as string | null;
  if (existingCode) await leaveRoomInternal(existingCode, uid);
}

// Any connected client can run this watchdog -- there's no always-on server
// to do it, so it runs on every member's interval, guarded entirely by
// database.rules.json (not by trusting the caller).
async function runWatchdog(code: string, myUid: string): Promise<void> {
  const now = Date.now();

  const [hostUidSnap, membersSnap] = await Promise.all([
    get(ref(db, `${ROOMS_PATH}/${code}/hostUid`)).catch(() => null),
    get(ref(db, `${ROOMS_PATH}/${code}/members`)).catch(() => null),
  ]);
  if (!hostUidSnap || !membersSnap) return;
  const hostUid = hostUidSnap.val() as string | null;
  const members = (membersSnap.val() || {}) as Record<string, RoomMember>;
  const hostMember = hostUid ? members[hostUid] : null;
  if (hostMember && !hostMember.online && hostMember.disconnectedAt && now - hostMember.disconnectedAt > HOST_RECONNECT_GRACE_MS) {
    const onlineMembers = Object.entries(members).filter(([id, m]) => id !== hostUid && m.online);
    if (onlineMembers.length > 0) {
      const next = onlineMembers.sort((a, b) => a[1].joinedAt - b[1].joinedAt)[0];
      // Every member's watchdog computes the same `next` deterministically --
      // only having the winner-to-be attempt the write (instead of all of
      // them racing the same transaction) avoids the losers getting rejected
      // by the rules, which Firebase logs internally regardless of .catch().
      if (next[0] === myUid) await reassignHost(code, hostUid!, next[0]);
    }
  }

  const episodeChangeSnap = await get(ref(db, `${ROOMS_PATH}/${code}/episodeChange`)).catch(() => null);
  const episodeChange = (episodeChangeSnap?.val() ?? null) as EpisodeChange | null;
  if (episodeChange) {
    const pending = Object.keys(episodeChange.pendingUids || {});
    if (now - episodeChange.initiatedAt >= EPISODE_CHANGE_DECISION_WINDOW_MS) {
      const updates: Record<string, unknown> = { [`${ROOMS_PATH}/${code}/episodeChange`]: null };
      for (const pendingUid of pending) updates[`${ROOMS_PATH}/${code}/members/${pendingUid}`] = null;
      await update(ref(db), updates).catch(swallow('watchdog: kick non-followers'));
      const stillThere = Object.keys(members).filter((id) => !pending.includes(id));
      if (stillThere.length === 0) await update(ref(db, `${ROOMS_PATH}/${code}`), { emptySince: Date.now() }).catch(swallow('watchdog: mark empty'));
    } else if (pending.length === 0) {
      await remove(ref(db, `${ROOMS_PATH}/${code}/episodeChange`)).catch(swallow('watchdog: clear episodeChange'));
    }
  }

  const chatSnap = await get(ref(db, `${ROOMS_PATH}/${code}/chat`)).catch(() => null);
  const chat = (chatSnap?.val() || {}) as Record<string, ChatMessage>;
  const staleChatUpdates: Record<string, null> = {};
  for (const [id, msg] of Object.entries(chat)) {
    if (now - msg.createdAt > CHAT_RETENTION_MS) staleChatUpdates[`${ROOMS_PATH}/${code}/chat/${id}`] = null;
  }
  if (Object.keys(staleChatUpdates).length > 0) await update(ref(db), staleChatUpdates).catch(swallow('watchdog: prune chat'));
}

export function WatchPartyProvider({ children }: { children: React.ReactNode }) {
  const { t } = useLanguage();
  const uidRef = useRef<string | null>(null);
  const roomUnsubRef = useRef<Unsubscribe | null>(null);
  const watchdogIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const seenChatIdsRef = useRef<Set<string>>(new Set());
  const seenReactionIdsRef = useRef<Set<string>>(new Set());
  const initialLoadRef = useRef(true);
  const prevMembersRef = useRef<Record<string, RoomMember> | null>(null);

  const reportError = useCallback((code: string, message: string) => {
    useWatchPartyRoomStore.getState().setError({ code, message });
    toast.error(message);
  }, []);

  const detachFromRoom = useCallback(() => {
    if (roomUnsubRef.current) {
      roomUnsubRef.current();
      roomUnsubRef.current = null;
    }
    if (watchdogIntervalRef.current) {
      clearInterval(watchdogIntervalRef.current);
      watchdogIntervalRef.current = null;
    }
    seenChatIdsRef.current = new Set();
    seenReactionIdsRef.current = new Set();
    initialLoadRef.current = true;
    prevMembersRef.current = null;
  }, []);

  const applySnapshot = useCallback((room: Room, uid: string) => {
    // Diff against the *previous* member map (captured before applying the
    // new snapshot below, so a departed member's nickname is still known)
    // to synthesize join/leave lines for the chat log. Skipped on the very
    // first snapshot for a room -- otherwise everyone already there would
    // show up as "just joined" the moment you attach.
    const prevMembers = prevMembersRef.current;
    const currentMembers = room.members || {};
    if (prevMembers) {
      const now = Date.now();
      for (const memberUid of Object.keys(currentMembers)) {
        if (!(memberUid in prevMembers)) {
          const nickname = currentMembers[memberUid]?.nickname ?? '';
          useWatchPartyRoomStore.getState().addSystemEvent({
            id: `sys-join-${memberUid}-${now}`,
            text: t('watchparty.system_joined', { nickname }),
            createdAt: now,
          });
        }
      }
      for (const memberUid of Object.keys(prevMembers)) {
        if (!(memberUid in currentMembers)) {
          const nickname = prevMembers[memberUid]?.nickname ?? '';
          useWatchPartyRoomStore.getState().addSystemEvent({
            id: `sys-leave-${memberUid}-${now}`,
            text: t('watchparty.system_left', { nickname }),
            createdAt: now,
          });
        }
      }
    }
    prevMembersRef.current = currentMembers;

    const store = useWatchPartyRoomStore.getState();
    store.applyRoomSnapshot(room, uid);

    const isInitialLoad = initialLoadRef.current;
    for (const [id, msg] of Object.entries(room.chat || {})) {
      if (seenChatIdsRef.current.has(id)) continue;
      seenChatIdsRef.current.add(id);
      if (isInitialLoad) continue;
      useWatchPartyRoomStore.getState().addFloatingEvent({ id, kind: 'chat', nickname: msg.nickname, text: msg.text });
      setTimeout(() => useWatchPartyRoomStore.getState().removeFloatingEvent(id), FLOATING_EVENT_LIFETIME_MS);
    }
    for (const [id, reaction] of Object.entries(room.reactions || {})) {
      if (seenReactionIdsRef.current.has(id)) continue;
      seenReactionIdsRef.current.add(id);
      if (isInitialLoad) continue;
      useWatchPartyRoomStore.getState().addFloatingEvent({ id, kind: 'reaction', nickname: reaction.nickname, icon: reaction.icon });
      setTimeout(() => useWatchPartyRoomStore.getState().removeFloatingEvent(id), FLOATING_EVENT_LIFETIME_MS);
    }
    initialLoadRef.current = false;
  }, [t]);

  const attachToRoom = useCallback((code: string, uid: string) => {
    detachFromRoom();

    const memberRef = ref(db, `${ROOMS_PATH}/${code}/members/${uid}`);
    update(memberRef, { online: true, disconnectedAt: null }).catch(swallow('presence: mark online'));
    onDisconnect(memberRef).update({ online: false, disconnectedAt: serverTimestamp() }).catch(swallow('presence: register onDisconnect'));

    const roomRef = ref(db, `${ROOMS_PATH}/${code}`);
    roomUnsubRef.current = onValue(
      roomRef,
      (snap) => {
        const room = snap.val() as Room | null;
        if (!room) {
          detachFromRoom();
          useWatchPartyRoomStore.getState().clearRoom();
          return;
        }
        applySnapshot(room, uid);
      },
      swallow('room subscription')
    );

    useWatchPartyRoomStore.getState().setRoomCode(code);
    runWatchdog(code, uid);
    watchdogIntervalRef.current = setInterval(() => runWatchdog(code, uid), HOST_WATCHDOG_INTERVAL_MS);
  }, [detachFromRoom, applySnapshot]);

  useEffect(() => {
    const connRef = ref(db, '.info/connected');
    const unsub = onValue(connRef, (snap) => {
      useWatchPartyRoomStore.getState().setConnectionStatus(snap.val() ? 'connected' : 'disconnected');
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    let cancelled = false;

    ensureAnonymousAuth()
      .then(async (user) => {
        if (cancelled) return;
        uidRef.current = user.uid;
        useWatchPartyRoomStore.getState().setMyUid(user.uid);

        const mappingSnap = await get(ref(db, `${UID_TO_ROOM_PATH}/${user.uid}`)).catch(() => null);
        const code = mappingSnap?.val() as string | null;
        if (!code || cancelled) return;
        const roomSnap = await get(ref(db, `${ROOMS_PATH}/${code}`)).catch(() => null);
        if (!roomSnap?.exists()) {
          await remove(ref(db, `${UID_TO_ROOM_PATH}/${user.uid}`)).catch(swallow('resume: clear stale uid mapping'));
          return;
        }
        attachToRoom(code, user.uid);
      })
      .catch((err) => {
        console.error('Watch Party anonymous auth failed:', err);
      });

    return () => {
      cancelled = true;
      detachFromRoom();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const requireUid = useCallback(async (): Promise<string> => {
    const user = await ensureAnonymousAuth();
    uidRef.current = user.uid;
    return user.uid;
  }, []);

  // Google sign-in upgrades the anonymous uid in place (see hooks/useAuth.tsx
  // linkWithPopup), so a member already in a room just needs their `verified`
  // flag refreshed -- no need to rejoin.
  const authIsAnonymous = useAuthStore((s) => s.user?.isAnonymous);
  useEffect(() => {
    const uid = uidRef.current;
    const code = useWatchPartyRoomStore.getState().roomCode;
    if (!uid || !code || authIsAnonymous === undefined) return;
    update(ref(db, `${ROOMS_PATH}/${code}/members/${uid}`), { verified: !authIsAnonymous }).catch(swallow('verified flag refresh'));
  }, [authIsAnonymous]);

  const actions: WatchPartyActions = {
    createRoom: (movieSlug, episodeSlug, nickname) => {
      (async () => {
        try {
          const uid = await requireUid();
          await leaveCurrentRoomIfAny(uid);

          const now = Date.now();
          const newRoom: Room = {
            movieSlug, episodeSlug, hostUid: uid, allowMemberControl: false,
            createdAt: now, emptySince: null,
            members: { [uid]: { nickname: sanitizeNickname(nickname), joinedAt: now, online: true, disconnectedAt: null, verified: isVerified() } },
            // Must be serverTimestamp(), not a client Date.now() -- the
            // security rule for playback/updatedAt requires the write to
            // equal the *server's* now, which only a serverTimestamp()
            // placeholder resolves to. A plain client number here made every
            // room creation fail the room's own validate rule.
            playback: { isPlaying: false, currentTime: 0, updatedAt: serverTimestamp() as unknown as number },
          };

          let code = generateRoomCode();
          let committed = false;
          for (let attempt = 0; attempt < CREATE_ROOM_MAX_ATTEMPTS && !committed; attempt++) {
            const roomRef = ref(db, `${ROOMS_PATH}/${code}`);
            const result = await runTransaction(roomRef, (existing) => (existing !== null ? undefined : newRoom));
            committed = result.committed;
            if (!committed) code = generateRoomCode();
          }
          if (!committed) {
            reportError(WATCH_PARTY_ERROR_CODES.CREATE_FAILED, t('watchparty.error_create_failed'));
            return;
          }
          await set(ref(db, `${UID_TO_ROOM_PATH}/${uid}`), code);
          attachToRoom(code, uid);
        } catch (err) {
          console.error('Watch Party: createRoom failed:', err);
          reportError(WATCH_PARTY_ERROR_CODES.CREATE_FAILED, t('watchparty.error_create_failed'));
        }
      })();
    },

    joinRoom: (codeRaw, nickname) => {
      (async () => {
        try {
          const uid = await requireUid();
          const code = normalizeRoomCode(codeRaw);
          await leaveCurrentRoomIfAny(uid);

          const roomRef = ref(db, `${ROOMS_PATH}/${code}`);
          let roomSnap = await get(roomRef);
          if (roomSnap.exists() && isStaleEmptyRoom(roomSnap.val() as Room, Date.now())) {
            await remove(roomRef).catch(swallow('join: clear stale room'));
            roomSnap = await get(roomRef);
          }
          if (!roomSnap.exists()) {
            reportError(WATCH_PARTY_ERROR_CODES.ROOM_NOT_FOUND, t('watchparty.error_room_not_found'));
            return;
          }

          const room = roomSnap.val() as Room;
          const existing = room.members?.[uid];
          const now = Date.now();
          await update(ref(db, `${ROOMS_PATH}/${code}/members/${uid}`), {
            nickname: sanitizeNickname(nickname),
            joinedAt: existing?.joinedAt ?? now,
            online: true,
            disconnectedAt: null,
            verified: isVerified(),
          });
          await update(roomRef, { emptySince: null });
          await set(ref(db, `${UID_TO_ROOM_PATH}/${uid}`), code);
          attachToRoom(code, uid);
        } catch (err) {
          console.error('Watch Party: joinRoom failed:', err);
          reportError(WATCH_PARTY_ERROR_CODES.ROOM_NOT_FOUND, t('watchparty.error_room_not_found'));
        }
      })();
    },

    leaveRoom: () => {
      const uid = uidRef.current;
      const code = useWatchPartyRoomStore.getState().roomCode;
      detachFromRoom();
      useWatchPartyRoomStore.getState().clearRoom();
      if (uid && code) leaveRoomInternal(code, uid);
    },

    setNickname: (nickname) => {
      const uid = uidRef.current;
      const code = useWatchPartyRoomStore.getState().roomCode;
      if (!uid || !code) return;
      update(ref(db, `${ROOMS_PATH}/${code}/members/${uid}`), { nickname: sanitizeNickname(nickname), verified: isVerified() })
        .catch(() => reportError(WATCH_PARTY_ERROR_CODES.GENERIC, t('watchparty.error_generic')));
    },

    setAllowMemberControl: (value) => {
      const uid = uidRef.current;
      const state = useWatchPartyRoomStore.getState();
      if (!uid || !state.roomCode || state.hostUid !== uid) return;
      update(ref(db, `${ROOMS_PATH}/${state.roomCode}`), { allowMemberControl: value })
        .catch(() => reportError(WATCH_PARTY_ERROR_CODES.GENERIC, t('watchparty.error_generic')));
    },

    updatePlayback: (isPlaying, currentTime) => {
      const state = useWatchPartyRoomStore.getState();
      if (!state.roomCode || !state.canControlPlayback()) return;
      update(ref(db, `${ROOMS_PATH}/${state.roomCode}/playback`), { isPlaying, currentTime, updatedAt: serverTimestamp() })
        .catch(swallow('playback sync'));
    },

    changeEpisode: (movieSlug, episodeSlug) => {
      (async () => {
        try {
          const uid = uidRef.current;
          const state = useWatchPartyRoomStore.getState();
          if (!uid || !state.roomCode || state.hostUid !== uid) return;

          const membersSnap = await get(ref(db, `${ROOMS_PATH}/${state.roomCode}/members`));
          const members = (membersSnap.val() || {}) as Record<string, RoomMember>;
          const pendingUids: Record<string, true> = {};
          for (const memberUid of Object.keys(members)) {
            if (memberUid !== uid) pendingUids[memberUid] = true;
          }

          await update(ref(db, `${ROOMS_PATH}/${state.roomCode}`), {
            movieSlug, episodeSlug,
            playback: { isPlaying: false, currentTime: 0, updatedAt: serverTimestamp() },
            episodeChange: { movieSlug, episodeSlug, initiatedAt: serverTimestamp(), pendingUids },
          });
        } catch (err) {
          console.error('Watch Party: changeEpisode failed:', err);
          reportError(WATCH_PARTY_ERROR_CODES.GENERIC, t('watchparty.error_generic'));
        }
      })();
    },

    decideEpisodeChange: (accept) => {
      const uid = uidRef.current;
      const code = useWatchPartyRoomStore.getState().roomCode;
      if (!uid || !code) return;
      if (accept) {
        remove(ref(db, `${ROOMS_PATH}/${code}/episodeChange/pendingUids/${uid}`)).catch(swallow('episode change: confirm follow'));
      } else {
        detachFromRoom();
        useWatchPartyRoomStore.getState().clearRoom();
        leaveRoomInternal(code, uid);
      }
    },

    sendChat: (text) => {
      (async () => {
        try {
          const uid = uidRef.current;
          const state = useWatchPartyRoomStore.getState();
          if (!uid || !state.roomCode) return;
          const trimmed = text.trim().slice(0, MAX_CHAT_LEN);
          if (!trimmed) return;

          const cooldownSnap = await get(ref(db, `${ROOMS_PATH}/${state.roomCode}/chatCooldown/${uid}`));
          const last = cooldownSnap.val() as number | null;
          if (last && Date.now() - last < CHAT_COOLDOWN_MS) {
            reportError(WATCH_PARTY_ERROR_CODES.CHAT_COOLDOWN, t('watchparty.error_chat_cooldown'));
            return;
          }

          const nickname = state.members.find((m) => m.uid === uid)?.nickname ?? '';
          const chatRef = push(ref(db, `${ROOMS_PATH}/${state.roomCode}/chat`));
          await update(ref(db), {
            [`${ROOMS_PATH}/${state.roomCode}/chat/${chatRef.key}`]: { uid, nickname, text: trimmed, createdAt: serverTimestamp(), verified: isVerified() },
            [`${ROOMS_PATH}/${state.roomCode}/chatCooldown/${uid}`]: serverTimestamp(),
          });
        } catch (err) {
          console.error('Watch Party: sendChat failed:', err);
          reportError(WATCH_PARTY_ERROR_CODES.GENERIC, t('watchparty.error_generic'));
        }
      })();
    },

    sendReaction: (icon) => {
      (async () => {
        try {
          const uid = uidRef.current;
          const state = useWatchPartyRoomStore.getState();
          if (!uid || !state.roomCode) return;
          const nickname = state.members.find((m) => m.uid === uid)?.nickname ?? '';
          const reactionRef = push(ref(db, `${ROOMS_PATH}/${state.roomCode}/reactions`));
          await set(reactionRef, { uid, nickname, icon, createdAt: serverTimestamp() });
          onDisconnect(reactionRef).remove().catch(swallow('reaction: register onDisconnect'));
          setTimeout(() => {
            onDisconnect(reactionRef).cancel().catch(() => {});
            remove(reactionRef).catch(swallow('reaction: cleanup'));
          }, REACTION_TTL_MS);
        } catch (err) {
          console.error('Watch Party: sendReaction failed:', err);
        }
      })();
    },

    transferHost: (targetUid) => {
      const uid = uidRef.current;
      const code = useWatchPartyRoomStore.getState().roomCode;
      if (!uid || !code) return;
      reassignHost(code, uid, targetUid);
    },
  };

  return <WatchPartyContext.Provider value={actions}>{children}</WatchPartyContext.Provider>;
}

export function useWatchParty() {
  const context = useContext(WatchPartyContext);
  if (!context) {
    throw new Error('useWatchParty must be used within a WatchPartyProvider');
  }
  return context;
}
