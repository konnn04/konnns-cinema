import { create } from 'zustand';
import type { ChatMessageSnapshot, MemberSnapshot, PlaybackState, Room } from '@/lib/watchParty/types';
import { MAX_CHAT_MESSAGES, type ReactionIcon } from '@/lib/watchParty/constants';

export type ConnectionStatus = 'disconnected' | 'connecting' | 'connected';

export interface FloatingEvent {
  id: string;
  kind: 'chat' | 'reaction';
  nickname: string;
  text?: string;
  icon?: ReactionIcon;
}

export interface SystemEvent {
  id: string;
  text: string;
  createdAt: number;
}

interface WatchPartyRoomState {
  connectionStatus: ConnectionStatus;
  myUid: string | null;
  roomCode: string | null;
  movieSlug: string | null;
  episodeSlug: string | null;
  hostUid: string | null;
  allowMemberControl: boolean;
  members: MemberSnapshot[];
  playback: PlaybackState | null;
  chatMessages: ChatMessageSnapshot[];
  floatingEvents: FloatingEvent[];
  systemEvents: SystemEvent[];
  pendingEpisodeChange: { movieSlug: string; episodeSlug: string } | null;
  lastError: { code: string; message: string } | null;

  isHost: () => boolean;
  canControlPlayback: () => boolean;

  setConnectionStatus: (status: ConnectionStatus) => void;
  setMyUid: (uid: string) => void;
  setRoomCode: (code: string | null) => void;
  applyRoomSnapshot: (room: Room, myUid: string) => void;
  clearRoom: () => void;
  addFloatingEvent: (event: FloatingEvent) => void;
  removeFloatingEvent: (id: string) => void;
  addSystemEvent: (event: SystemEvent) => void;
  setError: (error: { code: string; message: string } | null) => void;
}

export const useWatchPartyRoomStore = create<WatchPartyRoomState>()((set, get) => ({
  connectionStatus: 'connecting',
  myUid: null,
  roomCode: null,
  movieSlug: null,
  episodeSlug: null,
  hostUid: null,
  allowMemberControl: false,
  members: [],
  playback: null,
  chatMessages: [],
  floatingEvents: [],
  systemEvents: [],
  pendingEpisodeChange: null,
  lastError: null,

  isHost: () => {
    const s = get();
    return !!s.myUid && s.myUid === s.hostUid;
  },
  canControlPlayback: () => {
    const s = get();
    return s.isHost() || s.allowMemberControl;
  },

  setConnectionStatus: (status) => set({ connectionStatus: status }),
  setMyUid: (uid) => set({ myUid: uid }),
  setRoomCode: (code) => set({ roomCode: code }),

  applyRoomSnapshot: (room, myUid) => {
    const members: MemberSnapshot[] = Object.entries(room.members || {})
      .map(([uid, m]) => ({ uid, ...m, isHost: uid === room.hostUid }))
      .sort((a, b) => a.joinedAt - b.joinedAt);

    const chatMessages: ChatMessageSnapshot[] = Object.entries(room.chat || {})
      .map(([id, msg]) => ({ id, ...msg }))
      .sort((a, b) => a.createdAt - b.createdAt)
      .slice(-MAX_CHAT_MESSAGES);

    const pendingEpisodeChange = room.episodeChange?.pendingUids?.[myUid]
      ? { movieSlug: room.episodeChange.movieSlug, episodeSlug: room.episodeChange.episodeSlug }
      : null;

    set({
      movieSlug: room.movieSlug,
      episodeSlug: room.episodeSlug,
      hostUid: room.hostUid,
      allowMemberControl: room.allowMemberControl,
      members,
      playback: room.playback,
      chatMessages,
      pendingEpisodeChange,
    });
  },

  clearRoom: () => set({
    roomCode: null,
    movieSlug: null,
    episodeSlug: null,
    hostUid: null,
    allowMemberControl: false,
    members: [],
    playback: null,
    chatMessages: [],
    floatingEvents: [],
    systemEvents: [],
    pendingEpisodeChange: null,
  }),

  addFloatingEvent: (event) => set((s) => ({ floatingEvents: [...s.floatingEvents, event] })),
  removeFloatingEvent: (id) => set((s) => ({ floatingEvents: s.floatingEvents.filter((e) => e.id !== id) })),
  addSystemEvent: (event) => set((s) => ({ systemEvents: [...s.systemEvents, event].slice(-MAX_CHAT_MESSAGES) })),
  setError: (error) => set({ lastError: error }),
}));
