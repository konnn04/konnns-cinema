'use client';

import { Tv, ArrowRight, X } from 'lucide-react';
import { ServerData } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

interface AutoNextOverlayProps {
  nextEpisode: ServerData;
  counter: number;
  onCancel: () => void;
  onPlayNow: () => void;
}

export default function AutoNextOverlay({ nextEpisode, counter, onCancel, onPlayNow }: AutoNextOverlayProps) {
  const { t } = useLanguage();

  return (
    <div
      onClick={(e) => e.stopPropagation()}
      onMouseDown={(e) => e.stopPropagation()}
      onTouchStart={(e) => e.stopPropagation()}
      className="absolute inset-0 z-40 flex flex-col items-center justify-center bg-zinc-950/95 backdrop-blur-sm p-6 text-center rounded-none select-none pointer-events-auto"
    >
      <Tv className="w-12 h-12 text-[#E2B646] mb-3 animate-pulse" />
      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">
        {t('player.episode_completed') || 'Tập Hoàn Thành'}
      </span>
      <h3 className="font-serif font-black italic text-xl text-white mt-1 leading-tight">
        {t('player.up_next') || 'Xem tiếp'}: {nextEpisode.name}
      </h3>

      <div className="flex items-center gap-4 mt-6 pointer-events-auto">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onCancel();
          }}
          className="flex items-center space-x-1.5 px-5 py-2.5 border border-zinc-700 bg-zinc-900/80 hover:bg-zinc-800 rounded-none text-xs font-semibold text-zinc-300 hover:text-white transition-all cursor-pointer shadow-lg"
        >
          <X size={14} />
          <span>{t('player.cancel') || 'Hủy bỏ'}</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onPlayNow();
          }}
          className="flex items-center space-x-2 px-6 py-2.5 bg-[#E2B646] text-black font-serif text-xs font-black tracking-widest uppercase hover:bg-white hover:shadow-[#E2B646]/20 hover:shadow-xl transition-all cursor-pointer rounded-none"
        >
          <span>{t('player.play_now') || 'Phát ngay'} ({counter}s)</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
