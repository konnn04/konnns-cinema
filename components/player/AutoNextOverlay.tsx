'use client';

import { Tv, ArrowRight } from 'lucide-react';
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
    <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-zinc-950/95 p-6 text-center rounded-none">
      <Tv className="w-12 h-12 text-[#E2B646] mb-3 animate-pulse" />
      <span className="text-[10px] uppercase font-mono tracking-widest text-zinc-500">{t('player.episode_completed')}</span>
      <h3 className="font-serif font-black italic text-xl text-white mt-1 leading-tight">
        Up Next: {nextEpisode.name}
      </h3>

      <div className="flex items-center gap-4 mt-6">
        <button
          onClick={onCancel}
          className="px-5 py-2.5 border border-zinc-850 rounded-none text-xs font-semibold text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
        >
          Cancel
        </button>

        <button
          onClick={onPlayNow}
          className="flex items-center space-x-2 px-6 py-2.5 bg-[#E2B646] text-black font-serif text-xs font-black tracking-widest uppercase hover:bg-white transition-all cursor-pointer rounded-none"
        >
          <span>Play Now ({counter}s)</span>
          <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
}
