'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Users, ChevronDown, ChevronUp } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import WatchPartyPanel from './WatchPartyPanel';

interface WatchPartyToggleProps {
  movieSlug: string;
  episodeSlug: string;
  initialJoinCode?: string;
  currentTime?: number;
  isPlaying?: boolean;
}

export default function WatchPartyToggle({ movieSlug, episodeSlug, initialJoinCode, currentTime, isPlaying }: WatchPartyToggleProps) {
  const { t } = useLanguage();
  // Arriving via a share link (?room=CODE) should surface the join UI
  // immediately rather than leaving it tucked behind a collapsed toggle.
  const [isOpen, setIsOpen] = useState(!!initialJoinCode);

  return (
    <div className="border border-zinc-800 bg-black/30">
      {/* Toggle header */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-3 hover:bg-zinc-900/40 transition-colors cursor-pointer group"
      >
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 bg-[#E2B646]/10 border border-[#E2B646]/20">
            <Users size={14} className="text-[#E2B646]" />
          </div>
          <div className="text-left">
            <span className="text-xs font-bold font-sans text-zinc-200 group-hover:text-white transition-colors">
              {t('watchparty.toggle_title') || 'Xem Phim Chung'}
            </span>
            <p className="text-[9px] text-zinc-500 font-sans mt-0.5">
              {t('watchparty.toggle_subtitle') || 'Muốn xem chung cùng bạn?'}
            </p>
          </div>
        </div>
        <div className="text-zinc-500 group-hover:text-zinc-300 transition-colors">
          {isOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
        </div>
      </button>

      {/* Collapsible content */}
      <AnimatePresence initial={false}>
        {isOpen && (
          <motion.div
            key="panel"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.25, ease: 'easeInOut' }}
            className="overflow-hidden border-t border-zinc-800"
          >
            <div className="p-3">
              <WatchPartyPanel
                movieSlug={movieSlug}
                episodeSlug={episodeSlug}
                initialJoinCode={initialJoinCode}
                currentTime={currentTime}
                isPlaying={isPlaying}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
