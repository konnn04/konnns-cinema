'use client';

import { motion, AnimatePresence } from 'motion/react';
import { Play } from 'lucide-react';
import { MovieDetail, resolveImageUrl } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import PosterImage from '@/components/PosterImage';

interface CinemaTicketProps {
  movie: MovieDetail;
  isStamped: boolean;
  isTearing: boolean;
  resumeEpisode: { name: string; slug: string; progress: number } | null;
  onWatchClick: () => void;
}

// Decorative cinema-ticket UI: perforation lines, stub, tear-off stamp animation.
export default function CinemaTicket({ movie, isStamped, isTearing, resumeEpisode, onWatchClick }: CinemaTicketProps) {
  const { t } = useLanguage();
  const primaryGenre = movie.category?.[0]?.name || 'Cinema';
  const imageUrl = resolveImageUrl(movie.thumb_url || movie.poster_url);

  return (
    <div className="relative w-full border border-zinc-800 bg-black/60 rounded-none overflow-hidden backdrop-blur-md shadow-xl flex flex-col md:flex-row h-auto md:h-[180px]">
      <div className="absolute top-0 left-0 right-0 h-[1.5px] bg-[#E2B646] opacity-80" />

      <AnimatePresence>
        {isStamped && (
          <motion.div
            initial={{ scale: 3, opacity: 0, rotate: -20 }}
            animate={{ scale: 1, opacity: 1, rotate: -12 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', damping: 10, stiffness: 100 }}
            className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
          >
            <div className="px-6 py-2 border-4 border-[#E2B646] rounded-none font-serif text-4xl font-black tracking-widest text-[#E2B646] uppercase scale-110 shadow-lg rotate-[-12deg] bg-black/95">
              USED TICKET
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Left Half (QR + Poster Thumb stub) */}
      <div className="p-4 flex items-center gap-4 bg-zinc-950/40 md:w-[220px] shrink-0 border-b md:border-b-0 border-zinc-850">
        <div className="relative aspect-[9/13] w-14 rounded-none overflow-hidden border border-zinc-800 flex-none bg-zinc-900">
          <PosterImage src={imageUrl} alt={movie.name} className="object-cover" referrerPolicy="no-referrer" iconSize={16} />
        </div>

        <div className="flex flex-col space-y-1 w-full">
          <span className="text-[8px] font-mono font-medium tracking-widest text-zinc-500 uppercase">ACCESS CODE</span>
          <svg viewBox="0 0 100 35" className="w-full text-zinc-450 fill-current opacity-70">
            <rect x="0" y="0" width="4" height="35" />
            <rect x="6" y="0" width="2" height="35" />
            <rect x="10" y="0" width="8" height="35" />
            <rect x="20" y="0" width="1" height="35" />
            <rect x="23" y="0" width="3" height="35" />
            <rect x="28" y="0" width="6" height="35" />
            <rect x="36" y="0" width="2" height="35" />
            <rect x="40" y="0" width="8" height="35" />
            <rect x="50" y="0" width="1" height="35" />
            <rect x="53" y="0" width="4" height="35" />
            <rect x="59" y="0" width="3" height="35" />
            <rect x="64" y="0" width="6" height="35" />
            <rect x="72" y="0" width="1" height="35" />
            <rect x="75" y="0" width="5" height="35" />
            <rect x="82" y="0" width="2" height="35" />
            <rect x="86" y="0" width="8" height="35" />
            <rect x="96" y="0" width="4" height="35" />
          </svg>
          <span className="text-[7px] font-mono text-zinc-600 text-center select-none mt-1">SYS_DECK_{movie._id.slice(0, 8).toUpperCase()}</span>
        </div>
      </div>

      <div className="hidden md:block h-full relative w-[16px] overflow-hidden">
        <div className="absolute top-[-8px] bottom-[-8px] left-0 right-0 ticket-perforation-v" />
      </div>
      <div className="md:hidden relative w-full h-[16px] overflow-hidden">
        <div className="absolute left-[-8px] right-[-8px] top-0 bottom-0 ticket-perforation-h" />
      </div>

      {/* Right Half (Movie details + Play Stub Button) */}
      <div className="flex-1 p-5 flex flex-col justify-between relative bg-zinc-900/10 min-w-0">
        <div className="space-y-1.5 min-w-0">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-none bg-[#E2B646]/10 border border-[#E2B646]/20 text-[#E2B646] font-serif text-[8px] tracking-widest font-bold">
              {primaryGenre.toUpperCase()}
            </span>
            <span className="text-zinc-650 font-mono text-[10px]">&bull;</span>
            <span className="text-zinc-400 font-mono text-[10px]">{movie.quality}</span>
            <span className="text-zinc-650 font-mono text-[10px]">&bull;</span>
            <span className="text-zinc-400 font-mono text-[10px]">{movie.year}</span>
          </div>

          <h2 className="font-serif font-bold text-lg sm:text-xl text-white leading-tight truncate italic">
            {movie.name}
          </h2>
          <p className="font-sans text-[10px] text-zinc-500 truncate leading-none mt-0.5">{movie.origin_name}</p>
        </div>

        <div className="flex items-center justify-between gap-4 mt-4 border-t border-zinc-850 pt-3">
          <div className="flex flex-col">
            <span className="text-[8px] font-mono text-zinc-500 uppercase leading-none">STATUS</span>
            <span className="text-xs font-extrabold font-sans text-zinc-200 mt-1">{movie.episode_current || t('movie.status_airing')}</span>
          </div>

          <button
            onClick={onWatchClick}
            disabled={isTearing}
            className="flex items-center space-x-2 px-5 py-2.5 bg-[#E2B646] text-black font-serif text-[10px] font-bold tracking-widest uppercase hover:bg-white hover:glow-gold transition-all cursor-pointer relative overflow-hidden rounded-none"
          >
            <Play size={10} className="fill-current" />
            <span>{resumeEpisode ? `RESUME: ${resumeEpisode.name}` : 'WATCH NOW'}</span>
          </button>
        </div>
      </div>
    </div>
  );
}
