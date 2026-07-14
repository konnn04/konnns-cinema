import type { ReactionIcon } from './constants';

export interface RoomMember {
  nickname: string;
  joinedAt: number;
  online: boolean;
  disconnectedAt: number | null;
  verified?: boolean;
}

export interface ChatMessage {
  uid: string;
  nickname: string;
  text: string;
  createdAt: number;
  verified?: boolean;
}

export interface Reaction {
  uid: string;
  nickname: string;
  icon: ReactionIcon;
  createdAt: number;
}

export interface PlaybackState {
  isPlaying: boolean;
  currentTime: number;
  updatedAt: number;
}

export interface EpisodeChange {
  movieSlug: string;
  episodeSlug: string;
  initiatedAt: number;
  pendingUids: Record<string, true>;
}

export interface Room {
  movieSlug: string;
  episodeSlug: string;
  hostUid: string;
  allowMemberControl: boolean;
  createdAt: number;
  emptySince: number | null;
  members: Record<string, RoomMember>;
  playback: PlaybackState;
  chat?: Record<string, ChatMessage>;
  reactions?: Record<string, Reaction>;
  episodeChange?: EpisodeChange | null;
  chatCooldown?: Record<string, number>;
}

// Flattened, array-friendly view the UI/store actually consumes -- RTDB
// gives back Record<pushId, T> maps, this is what applySnapshot converts to.
// `isHost` is derived (uid === room.hostUid), not stored, so security rules
// don't have to trust a client-writable flag for something access-sensitive.
export interface MemberSnapshot extends RoomMember {
  uid: string;
  isHost: boolean;
}

export interface ChatMessageSnapshot extends ChatMessage {
  id: string;
}
