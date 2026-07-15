import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AudioPreset } from '@/hooks/useAudioEnhancer';
import type { UpscaleMode } from '@/lib/webgpu/upscale';
import type { FrameInterpolationMode } from '@/lib/webgpu/frameInterpolation';

interface PreferencesState {
  onboardingCompleted: boolean;
  favoriteGenres: string[];
  playerDefaultSpeed: number;
  playerVolume: number;
  playerMuted: boolean;
  playerAutoNext: boolean;
  playerImageEnhance: boolean;

  // BETA lab features -- see components/player/BetaLabMenu.tsx
  betaAudioPreset: AudioPreset;
  betaFsrUpscale: boolean;
  // 'sharpen': single-pass Laplacian unsharp mask, no resolution change
  // (cheap, low stall risk). 'fsr': Catmull-Rom bicubic upscale + RCAS
  // sharpen (heavier, actually raises resolution). 'anime4k': real Anime4K
  // CNN pipeline via the anime4k-webgpu package (heaviest, best on anime).
  betaFsrUpscaleMode: UpscaleMode;
  betaFrameInterpolation: boolean;
  // 'blend': cheap cross-fade, no motion-estimation compute pass (lighter on
  // the GPU, less contention with hardware video decode). 'motion': the
  // block-matching optical-flow pipeline.
  betaFrameInterpolationMode: FrameInterpolationMode;

  completeOnboarding: (genres?: string[]) => void;
  setFavoriteGenres: (genres: string[]) => void;
  toggleFavoriteGenre: (slug: string) => void;
  setPlayerDefaultSpeed: (speed: number) => void;
  setPlayerVolume: (volume: number) => void;
  setPlayerMuted: (muted: boolean) => void;
  setPlayerAutoNext: (value: boolean) => void;
  setPlayerImageEnhance: (value: boolean) => void;
  setBetaAudioPreset: (preset: AudioPreset) => void;
  setBetaFsrUpscale: (value: boolean) => void;
  setBetaFsrUpscaleMode: (mode: UpscaleMode) => void;
  setBetaFrameInterpolation: (value: boolean) => void;
  setBetaFrameInterpolationMode: (mode: FrameInterpolationMode) => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      onboardingCompleted: false,
      favoriteGenres: [],
      playerDefaultSpeed: 1,
      playerVolume: 1,
      playerMuted: false,
      playerAutoNext: true,
      playerImageEnhance: false,

      betaAudioPreset: 'none',
      betaFsrUpscale: false,
      betaFsrUpscaleMode: 'sharpen',
      betaFrameInterpolation: false,
      betaFrameInterpolationMode: 'blend',

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
      setPlayerVolume: (volume) => set({ playerVolume: volume }),
      setPlayerMuted: (muted) => set({ playerMuted: muted }),
      setPlayerAutoNext: (value) => set({ playerAutoNext: value }),
      setPlayerImageEnhance: (value) => set({ playerImageEnhance: value }),
      setBetaAudioPreset: (preset) => set({ betaAudioPreset: preset }),
      // FSR upscale and frame interpolation both take over the canvas output,
      // so enabling one turns the other off rather than trying to layer them.
      setBetaFsrUpscale: (value) => set({ betaFsrUpscale: value, betaFrameInterpolation: value ? false : get().betaFrameInterpolation }),
      setBetaFsrUpscaleMode: (mode) => set({ betaFsrUpscaleMode: mode }),
      setBetaFrameInterpolation: (value) => set({ betaFrameInterpolation: value, betaFsrUpscale: value ? false : get().betaFsrUpscale }),
      setBetaFrameInterpolationMode: (mode) => set({ betaFrameInterpolationMode: mode }),
    }),
    { name: 'cinema-preferences' }
  )
);
