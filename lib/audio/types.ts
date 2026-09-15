export type AudioPreset =
  | 'none'
  | 'super_bass'
  | 'cinema'
  | 'dialog'
  | 'treble'
  | 'night'
  | 'rock'
  | 'custom'
  // Legacy aliases for backward compatibility
  | 'bass'
  | 'loudness'
  | 'surround';

export interface AudioEqSettings {
  preset: AudioPreset;
  bands: [number, number, number, number, number, number]; // 60Hz, 150Hz, 400Hz, 1kHz, 3.5kHz, 10kHz (-12dB to +12dB)
  bassBoost: number; // 0 to 18 dB (dedicated sub-bass punch)
  vocalBoost: number; // 0 to 12 dB (dedicated dialog clarity)
  surround: number; // 0 to 1 (virtual surround wet mix)
  preamp: number; // 0 to 12 dB (overall gain)
}
