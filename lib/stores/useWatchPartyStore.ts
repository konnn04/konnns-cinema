import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface WatchPartyPrefsState {
  nickname: string;
  showFloatingComments: boolean;
  showChatPanel: boolean;
  showRoomInfo: boolean;
  setNickname: (nickname: string) => void;
  setShowFloatingComments: (value: boolean) => void;
  setShowChatPanel: (value: boolean) => void;
  setShowRoomInfo: (value: boolean) => void;
}

export const useWatchPartyStore = create<WatchPartyPrefsState>()(
  persist(
    (set) => ({
      nickname: '',
      showFloatingComments: true,
      showChatPanel: true,
      showRoomInfo: true,
      setNickname: (nickname) => set({ nickname }),
      setShowFloatingComments: (value) => set({ showFloatingComments: value }),
      setShowChatPanel: (value) => set({ showChatPanel: value }),
      setShowRoomInfo: (value) => set({ showRoomInfo: value }),
    }),
    { name: 'cinema-watch-party' }
  )
);
