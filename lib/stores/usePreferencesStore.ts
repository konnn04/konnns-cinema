import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AudioPreset } from '@/hooks/useAudioEnhancer';

interface PreferencesState {
  onboardingCompleted: boolean;
  favoriteGenres: string[];
  playerDefaultSpeed: number;
  playerAutoNext: boolean;
  playerImageEnhance: boolean;

  // BETA lab features -- see components/player/BetaLabMenu.tsx
  betaAudioPreset: AudioPreset;
  betaFsrUpscale: boolean;
  betaFrameInterpolation: boolean;

  completeOnboarding: (genres?: string[]) => void;
  setFavoriteGenres: (genres: string[]) => void;
  toggleFavoriteGenre: (slug: string) => void;
  setPlayerDefaultSpeed: (speed: number) => void;
  setPlayerAutoNext: (value: boolean) => void;
  setPlayerImageEnhance: (value: boolean) => void;
  setBetaAudioPreset: (preset: AudioPreset) => void;
  setBetaFsrUpscale: (value: boolean) => void;
  setBetaFrameInterpolation: (value: boolean) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      onboardingCompleted: false,
      favoriteGenres: [],
      playerDefaultSpeed: 1,
      playerAutoNext: true,
      playerImageEnhance: false,

      betaAudioPreset: 'none',
      betaFsrUpscale: false,
      betaFrameInterpolation: false,

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
      setBetaAudioPreset: (preset) => set({ betaAudioPreset: preset }),
      // FSR upscale and frame interpolation both take over the canvas output,
      // so enabling one turns the other off rather than trying to layer them.
      setBetaFsrUpscale: (value) => set({ betaFsrUpscale: value, betaFrameInterpolation: value ? false : get().betaFrameInterpolation }),
      setBetaFrameInterpolation: (value) => set({ betaFrameInterpolation: value, betaFsrUpscale: value ? false : get().betaFsrUpscale }),
    }),
    { name: 'cinema-preferences' }
  )
);
