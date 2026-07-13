import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface PreferencesState {
  onboardingCompleted: boolean;
  favoriteGenres: string[];
  playerDefaultSpeed: number;
  playerAutoNext: boolean;
  playerImageEnhance: boolean;

  completeOnboarding: (genres?: string[]) => void;
  setFavoriteGenres: (genres: string[]) => void;
  toggleFavoriteGenre: (slug: string) => void;
  setPlayerDefaultSpeed: (speed: number) => void;
  setPlayerAutoNext: (value: boolean) => void;
  setPlayerImageEnhance: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      onboardingCompleted: false,
      favoriteGenres: [],
      playerDefaultSpeed: 1,
      playerAutoNext: true,
      playerImageEnhance: false,

      completeOnboarding: (genres) => set({
        onboardingCompleted: true,
        ...(genres && genres.length > 0 ? { favoriteGenres: genres } : {}),
      }),
      setFavoriteGenres: (genres) => set({ favoriteGenres: genres }),
      toggleFavoriteGenre: (slug) => set((state) => ({
        favoriteGenres: state.favoriteGenres.includes(slug)
          ? state.favoriteGenres.filter((s) => s !== slug)
          : [...state.favoriteGenres, slug],
      })),
      setPlayerDefaultSpeed: (speed) => set({ playerDefaultSpeed: speed }),
      setPlayerAutoNext: (value) => set({ playerAutoNext: value }),
      setPlayerImageEnhance: (value) => set({ playerImageEnhance: value }),
    }),
    { name: 'cinema-preferences' }
  )
);
