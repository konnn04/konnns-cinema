import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MovieItem } from '@/lib/api';

interface ReminderState {
  reminders: MovieItem[];
  isReminded: (slug: string) => boolean;
  toggleReminder: (movie: MovieItem) => void;
}

export const useReminderStore = create<ReminderState>()(
  persist(
    (set, get) => ({
      reminders: [],
      isReminded: (slug) => get().reminders.some((m) => m.slug === slug),
      toggleReminder: (movie) => set((state) => {
        const exists = state.reminders.some((m) => m.slug === movie.slug);
        return {
          reminders: exists
            ? state.reminders.filter((m) => m.slug !== movie.slug)
            : [...state.reminders, movie],
        };
      }),
    }),
    { name: 'cinema-reminders' }
  )
);
