export type RemoteAction =
  | 'play'
  | 'pause'
  | 'togglePlay'
  | 'seekBy'
  | 'seekTo'
  | 'volume'
  | 'mute'
  | 'toggleFullscreen'
  | 'nextEpisode'
  | 'prevEpisode';

export interface RemoteCommand {
  id: string;
  action: RemoteAction;
  value?: number;
  timestamp: number;
}

export interface RemoteSessionState {
  sessionId: string;
  movieTitle?: string;
  episodeName?: string;
  posterUrl?: string;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  isMuted: boolean;
  lastUpdated: number;
  commands: RemoteCommand[];
}

export type PlaybackState = Omit<RemoteSessionState, 'commands'>;
