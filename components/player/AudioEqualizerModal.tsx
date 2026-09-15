'use client';

import { motion, AnimatePresence } from 'motion/react';
import { X, SlidersHorizontal, Volume2, RotateCcw, Sparkles, Flame, Film, Mic, Moon, Music } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { usePreferencesStore } from '@/lib/stores/usePreferencesStore';
import type { AudioPreset, AudioEqSettings } from '@/lib/audio/types';
import {
  EQ_FREQUENCIES,
  EQ_LABELS,
  AUDIO_PRESET_CONFIGS,
  DEFAULT_AUDIO_EQ_SETTINGS,
} from '@/lib/audio/constants';

interface AudioEqualizerModalProps {
  isOpen: boolean;
  onClose: () => void;
  audioError?: string | null;
}

interface PresetItem {
  id: AudioPreset;
  labelVi: string;
  labelEn: string;
  icon: typeof SlidersHorizontal;
}

const PRESET_LIST: PresetItem[] = [
  { id: 'none', labelVi: 'Tự nhiên (Flat)', labelEn: 'Flat / Off', icon: SlidersHorizontal },
  { id: 'super_bass', labelVi: 'Siêu Bass', labelEn: 'Super Bass', icon: Flame },
  { id: 'cinema', labelVi: 'Rạp phim', labelEn: 'Cinema', icon: Film },
  { id: 'dialog', labelVi: 'Rõ lời thoại', labelEn: 'Vocal Clarity', icon: Mic },
  { id: 'night', labelVi: 'Ban đêm', labelEn: 'Night Mode', icon: Moon },
  { id: 'rock', labelVi: 'Âm nhạc', labelEn: 'Music / Pop', icon: Music },
  { id: 'treble', labelVi: 'Âm bổng', labelEn: 'Treble Boost', icon: Sparkles },
  { id: 'custom', labelVi: 'Tự chỉnh', labelEn: 'Custom', icon: SlidersHorizontal },
];

export default function AudioEqualizerModal({ isOpen, onClose, audioError }: AudioEqualizerModalProps) {
  const { language } = useLanguage();
  const settings = usePreferencesStore((s) => s.audioEqSettings) || DEFAULT_AUDIO_EQ_SETTINGS;
  const setAudioEqSettings = usePreferencesStore((s) => s.setAudioEqSettings);

  const handleSelectPreset = (preset: AudioPreset) => {
    if (preset === 'custom') {
      // Inherit the exact current preset values into custom so user can fine-tune from there
      setAudioEqSettings((prev) => {
        const baseConfig = prev.preset !== 'custom' ? AUDIO_PRESET_CONFIGS[prev.preset] : null;
        if (baseConfig) {
          return {
            preset: 'custom',
            bands: [...baseConfig.bands] as [number, number, number, number, number, number],
            bassBoost: baseConfig.bassBoost,
            vocalBoost: baseConfig.vocalBoost,
            surround: baseConfig.surround,
            preamp: baseConfig.preamp,
          };
        }
        return {
          ...prev,
          preset: 'custom',
        };
      });
      return;
    }
    const config = AUDIO_PRESET_CONFIGS[preset] || AUDIO_PRESET_CONFIGS.none;
    const nextSettings: AudioEqSettings = {
      preset,
      bands: [...config.bands] as [number, number, number, number, number, number],
      bassBoost: config.bassBoost,
      vocalBoost: config.vocalBoost,
      surround: config.surround,
      preamp: config.preamp,
    };
    setAudioEqSettings(nextSettings);
  };

  const handleBandChange = (index: number, val: number) => {
    setAudioEqSettings((prev) => {
      const baseConfig = prev.preset !== 'custom' ? AUDIO_PRESET_CONFIGS[prev.preset] : null;
      const currentBands = baseConfig
        ? [...baseConfig.bands]
        : prev.bands && prev.bands.length === 6
        ? [...prev.bands]
        : [...DEFAULT_AUDIO_EQ_SETTINGS.bands];
      const newBands = currentBands as [number, number, number, number, number, number];
      newBands[index] = val;
      return {
        preset: 'custom',
        bands: newBands,
        bassBoost: baseConfig ? baseConfig.bassBoost : prev.bassBoost,
        vocalBoost: baseConfig ? baseConfig.vocalBoost : prev.vocalBoost,
        surround: baseConfig ? baseConfig.surround : prev.surround,
        preamp: baseConfig ? baseConfig.preamp : prev.preamp,
      };
    });
  };

  const handleBoostChange = (field: 'bassBoost' | 'vocalBoost' | 'surround' | 'preamp', val: number) => {
    setAudioEqSettings((prev) => {
      const baseConfig = prev.preset !== 'custom' ? AUDIO_PRESET_CONFIGS[prev.preset] : null;
      return {
        preset: 'custom',
        bands: baseConfig
          ? ([...baseConfig.bands] as [number, number, number, number, number, number])
          : prev.bands && prev.bands.length === 6
          ? [...prev.bands]
          : [...DEFAULT_AUDIO_EQ_SETTINGS.bands],
        bassBoost: baseConfig ? baseConfig.bassBoost : prev.bassBoost,
        vocalBoost: baseConfig ? baseConfig.vocalBoost : prev.vocalBoost,
        surround: baseConfig ? baseConfig.surround : prev.surround,
        preamp: baseConfig ? baseConfig.preamp : prev.preamp,
        [field]: val,
      };
    });
  };

  const handleReset = () => {
    handleSelectPreset('none');
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-2xl bg-zinc-950 border border-zinc-800 shadow-2xl p-3.5 sm:p-6 flex flex-col gap-4 sm:gap-5 text-white max-h-[92vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-2.5 sm:pb-3">
              <div className="flex items-center space-x-2 sm:space-x-2.5">
                <div className="p-1.5 sm:p-2 bg-[#E2B646]/10 border border-[#E2B646]/30 text-[#E2B646]">
                  <SlidersHorizontal size={16} className="sm:w-[18px] sm:h-[18px]" />
                </div>
                <div>
                  <h3 className="text-xs sm:text-base font-serif font-black tracking-wide text-white uppercase flex items-center gap-1.5 sm:gap-2">
                    <span>{language === 'vi' ? 'Bộ Tùy Biến Âm Thanh' : 'Audio Equalizer'}</span>
                    <span className="text-[8px] sm:text-[9px] font-mono px-1 sm:px-1.5 py-0.2 sm:py-0.5 border border-[#E2B646]/40 text-[#E2B646] uppercase font-normal">
                      Pro Cinema
                    </span>
                  </h3>
                  <p className="text-[10px] sm:text-[11px] text-zinc-400 font-sans mt-0.5 hidden sm:block">
                    {language === 'vi'
                      ? 'Điều chỉnh chất âm, tăng cường Super Bass và tối ưu giọng thoại rạp phim'
                      : 'Fine-tune sound frequencies, enhance Super Bass, and clarify speech'}
                  </p>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <button
                  onClick={handleReset}
                  className="flex items-center space-x-1 px-2.5 py-1 text-[10px] font-mono text-zinc-400 hover:text-zinc-200 border border-zinc-800 hover:border-zinc-700 transition-colors cursor-pointer"
                  title="Reset to flat"
                >
                  <RotateCcw size={11} />
                  <span>{language === 'vi' ? 'Đặt lại' : 'Reset'}</span>
                </button>
                <button
                  onClick={onClose}
                  className="p-1.5 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {audioError && (
              <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono">
                {audioError}
              </div>
            )}

            {/* Presets List */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <span>{language === 'vi' ? 'Chế độ âm thanh mẫu (Presets)' : 'Sound Presets'}</span>
                {settings.preset === 'custom' && (
                  <span className="text-[#E2B646] text-[10px] font-bold">
                    ● {language === 'vi' ? 'Đang tùy chỉnh cá nhân' : 'Custom Active'}
                  </span>
                )}
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {PRESET_LIST.map((item) => {
                  const Icon = item.icon;
                  const isActive = settings.preset === item.id;
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleSelectPreset(item.id)}
                      className={`flex items-center space-x-2 px-3 py-2 border text-xs font-mono transition-all cursor-pointer text-left ${isActive
                          ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold shadow-sm'
                          : 'border-zinc-850 bg-zinc-900/60 text-zinc-400 hover:text-zinc-200 hover:border-zinc-750'
                        }`}
                    >
                      <Icon size={14} className={isActive ? 'text-[#E2B646]' : 'text-zinc-500'} />
                      <span className="truncate">{language === 'vi' ? item.labelVi : item.labelEn}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Special Enhancement Boosters (Super Bass, Vocal Clarity, Surround, Preamp) */}
            <div className="bg-zinc-900/50 border border-zinc-850 p-4 space-y-3.5">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-300">
                <span className="flex items-center gap-1.5">
                  <Flame size={14} className="text-[#E2B646]" />
                  <span>{language === 'vi' ? 'Tăng Cường Nâng Cao' : 'Audio Boosters'}</span>
                </span>
                <span className="text-zinc-500 text-[10px]">
                  {language === 'vi' ? 'Tích hợp compressor chống rè khi bass mạnh' : 'Limiter enabled'}
                </span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Super Bass Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-white flex items-center gap-1">
                      <span>{language === 'vi' ? 'Super Bass Boost' : 'Super Bass'}</span>
                      <span className="text-[9px] text-[#E2B646] font-mono px-1 py-0.2 border border-[#E2B646]/40">SUB</span>
                    </span>
                    <span className="font-mono text-[#E2B646] font-black">+{settings.bassBoost} dB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={18}
                    step={1}
                    value={settings.bassBoost}
                    onChange={(e) => handleBoostChange('bassBoost', parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {language === 'vi'
                      ? 'Âm bass đánh cực sâu và uy lực cho phim hành động & cháy nổ.'
                      : 'Deep punchy low-end rumble with distortion protection.'}
                  </p>
                </div>

                {/* Vocal Clarity Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-white">
                      {language === 'vi' ? 'Độ Rõ Lời Thoại (Vocal)' : 'Vocal Clarity'}
                    </span>
                    <span className="font-mono text-[#E2B646] font-black">+{settings.vocalBoost} dB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={12}
                    step={1}
                    value={settings.vocalBoost}
                    onChange={(e) => handleBoostChange('vocalBoost', parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {language === 'vi'
                      ? 'Làm nổi bật giọng nói của diễn viên trong các cảnh ồn ào.'
                      : 'Boost center vocal frequencies for crisp, clear dialog.'}
                  </p>
                </div>

                {/* Virtual Surround Slider */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-white">
                      {language === 'vi' ? 'Âm Vòm Không Gian (Surround)' : 'Virtual Surround'}
                    </span>
                    <span className="font-mono text-[#E2B646] font-black">{Math.round(settings.surround * 100)}%</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={1}
                    step={0.05}
                    value={settings.surround}
                    onChange={(e) => handleBoostChange('surround', parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {language === 'vi'
                      ? 'Tạo cảm giác âm thanh đa hướng bao quanh như rạp chiếu phim.'
                      : 'Spatial acoustics impulse for wide cinematic immersion.'}
                  </p>
                </div>

                {/* Preamp Gain */}
                <div className="space-y-1.5">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-mono font-bold text-white flex items-center gap-1">
                      <Volume2 size={13} />
                      <span>{language === 'vi' ? 'Khuếch Đại Âm Lượng (Preamp)' : 'Preamp Gain'}</span>
                    </span>
                    <span className="font-mono text-[#E2B646] font-black">+{settings.preamp} dB</span>
                  </div>
                  <input
                    type="range"
                    min={0}
                    max={10}
                    step={0.5}
                    value={settings.preamp}
                    onChange={(e) => handleBoostChange('preamp', parseFloat(e.target.value))}
                    className="w-full h-1.5 accent-[#E2B646] bg-zinc-800 rounded-none cursor-pointer"
                  />
                  <p className="text-[10px] text-zinc-500 leading-tight">
                    {language === 'vi'
                      ? 'Khuếch đại tín hiệu nguồn đối với phim có âm thanh gốc bị nhỏ.'
                      : 'Boost overall master volume for quietly-mixed sources.'}
                  </p>
                </div>
              </div>
            </div>

            {/* 6-Band Graphic Equalizer Faders */}
            <div className="space-y-3">
              <div className="flex items-center justify-between text-[11px] font-mono uppercase tracking-wider text-zinc-400">
                <span>{language === 'vi' ? 'Bộ Lọc 6 Dải Tần Số (Graphic Equalizer)' : '6-Band Graphic Equalizer'}</span>
                <span className="text-[10px] text-zinc-500">-12 dB ~ +12 dB</span>
              </div>

              <div className="grid grid-cols-6 gap-2 sm:gap-4 p-3 bg-zinc-900/30 border border-zinc-850">
                {settings.bands.map((gainVal, idx) => (
                  <div key={EQ_FREQUENCIES[idx]} className="flex flex-col items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-bold ${gainVal > 0 ? 'text-[#E2B646]' : gainVal < 0 ? 'text-zinc-400' : 'text-zinc-500'
                        }`}
                    >
                      {gainVal > 0 ? `+${gainVal}` : gainVal}
                    </span>

                    <div className="relative h-32 flex items-center justify-center">
                      <div className="absolute w-1 h-full bg-zinc-800 pointer-events-none rounded-none" />
                      <div className="absolute top-1/2 w-3 h-[1px] bg-zinc-650 pointer-events-none" />
                      <input
                        type="range"
                        min={-12}
                        max={12}
                        step={1}
                        value={gainVal}
                        onChange={(e) => handleBandChange(idx, parseInt(e.target.value, 10))}
                        className="h-28 w-6 accent-[#E2B646] cursor-pointer bg-transparent [writing-mode:bt-lr]"
                        style={{
                          WebkitAppearance: 'slider-vertical',
                        } as React.CSSProperties}
                      />
                    </div>

                    <div className="text-center">
                      <span className="text-[10px] font-mono font-bold text-zinc-300 block">
                        {EQ_LABELS[idx]}
                      </span>
                      <span className="text-[8px] font-mono text-zinc-550 uppercase">
                        {idx === 0
                          ? 'Sub'
                          : idx === 1
                            ? 'Bass'
                            : idx === 2
                              ? 'Mid-L'
                              : idx === 3
                                ? 'Mid'
                                : idx === 4
                                  ? 'High'
                                  : 'Air'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Footer info & Done button */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
              <span className="text-[11px] font-mono text-zinc-500">
                {language === 'vi'
                  ? 'Thay đổi được áp dụng ngay lập tức và lưu tự động.'
                  : 'Settings apply in real-time and save automatically.'}
              </span>
              <button
                onClick={onClose}
                className="px-5 py-2 bg-[#E2B646] text-black font-serif font-black text-xs uppercase tracking-widest hover:bg-white transition-all cursor-pointer"
              >
                {language === 'vi' ? 'Hoàn tất' : 'Done'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
