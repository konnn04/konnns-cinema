import { AudioEqSettings } from './types';

export const EQ_FREQUENCIES = [60, 150, 400, 1000, 3500, 10000] as const;
export const EQ_LABELS = ['60Hz', '150Hz', '400Hz', '1kHz', '3.5kHz', '10kHz'] as const;

export const AUDIO_PRESET_CONFIGS: Record<string, Omit<AudioEqSettings, 'preset'>> = {
  none: {
    bands: [0, 0, 0, 0, 0, 0],
    bassBoost: 0,
    vocalBoost: 0,
    surround: 0,
    preamp: 0,
  },
  super_bass: {
    bands: [9, 7, 3, 0, 1, 2],
    bassBoost: 14,
    vocalBoost: 0,
    surround: 0.1,
    preamp: 2,
  },
  bass: {
    bands: [9, 7, 3, 0, 1, 2],
    bassBoost: 14,
    vocalBoost: 0,
    surround: 0.1,
    preamp: 2,
  },
  cinema: {
    bands: [6, 4, 1, 2, 3, 4],
    bassBoost: 6,
    vocalBoost: 4,
    surround: 0.35,
    preamp: 1,
  },
  dialog: {
    bands: [-4, -2, 2, 6, 5, 2],
    bassBoost: 0,
    vocalBoost: 7,
    surround: 0,
    preamp: 1.5,
  },
  treble: {
    bands: [-2, 0, 1, 3, 6, 8],
    bassBoost: 0,
    vocalBoost: 2,
    surround: 0.1,
    preamp: 1,
  },
  night: {
    bands: [-5, -3, 0, 3, 1, -2],
    bassBoost: 0,
    vocalBoost: 4,
    surround: 0,
    preamp: 0,
  },
  loudness: {
    bands: [-5, -3, 0, 3, 1, -2],
    bassBoost: 0,
    vocalBoost: 4,
    surround: 0,
    preamp: 0,
  },
  surround: {
    bands: [3, 2, 1, 1, 3, 4],
    bassBoost: 3,
    vocalBoost: 2,
    surround: 0.55,
    preamp: 0.5,
  },
  rock: {
    bands: [7, 5, -2, 1, 5, 6],
    bassBoost: 6,
    vocalBoost: 1,
    surround: 0.2,
    preamp: 1.5,
  },
};

export const DEFAULT_AUDIO_EQ_SETTINGS: AudioEqSettings = {
  preset: 'none',
  bands: [0, 0, 0, 0, 0, 0],
  bassBoost: 0,
  vocalBoost: 0,
  surround: 0,
  preamp: 0,
};
