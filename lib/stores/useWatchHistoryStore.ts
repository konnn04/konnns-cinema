import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CategoryItem } from '@/lib/api';

export interface WatchHistoryItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  quality?: string;
  episodeSlug: string;
  episodeName: string;
  progress: number;
  timestamp: number;
  updatedAt: string;
  category?: CategoryItem[];
}

interface WatchHistoryState {
  history: WatchHistoryItem[];
  getBySlug: (slug: string) => WatchHistoryItem | undefined;
  upsert: (item: WatchHistoryItem) => void;
  remove: (slug: string) => void;
  clear: () => void;
}

export const useWatchHistoryStore = create<WatchHistoryState>()(
  persist(
    (set, get) => ({
      history: [],
      getBySlug: (slug) => get().history.find((h) => h.slug === slug),
      upsert: (item) => set((state) => ({
        history: [item, ...state.history.filter((h) => h.slug !== item.slug)],
      })),
      remove: (slug) => set((state) => ({
        history: state.history.filter((h) => h.slug !== slug),
      })),
      clear: () => set({ history: [] }),
    }),
    { name: 'cinema-watch-history' }
  )
);
