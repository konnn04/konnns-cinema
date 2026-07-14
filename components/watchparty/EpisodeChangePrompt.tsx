'use client';

import { motion, AnimatePresence } from 'motion/react';
import { useRouter } from 'next/navigation';
import { Tv } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { useWatchParty } from '@/hooks/useWatchParty';
import { useWatchPartyRoomStore } from '@/lib/stores/useWatchPartyRoomStore';

export default function EpisodeChangePrompt() {
  const { t } = useLanguage();
  const router = useRouter();
  const party = useWatchParty();
  const pending = useWatchPartyRoomStore((s) => s.pendingEpisodeChange);

  if (!pending) return null;

  const handleFollow = () => {
    party.decideEpisodeChange(true);
    router.push(`/watch/${pending.movieSlug}/${pending.episodeSlug}`);
  };

  const handleStay = () => {
    party.decideEpisodeChange(false);
  };

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -12 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -12 }}
        className="absolute top-4 left-1/2 -translate-x-1/2 z-40 bg-zinc-950 border border-[#E2B646]/40 rounded-none shadow-2xl px-4 py-3 flex items-center gap-3"
      >
        <Tv size={16} className="text-[#E2B646] shrink-0" />
        <p className="text-xs text-zinc-200">{t('watchparty.episode_change_prompt')}</p>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={handleStay} className="px-3 py-1.5 border border-zinc-800 text-zinc-400 hover:text-white text-[10px] font-mono uppercase tracking-wider rounded-none cursor-pointer">
            {t('watchparty.stay')}
          </button>
          <button onClick={handleFollow} className="px-3 py-1.5 bg-[#E2B646] text-black text-[10px] font-mono font-bold uppercase tracking-wider rounded-none cursor-pointer">
            {t('watchparty.follow')}
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
