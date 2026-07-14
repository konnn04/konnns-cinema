'use client';

import { motion, AnimatePresence } from 'motion/react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { GENRES, COUNTRIES } from '@/lib/navLinks';

interface MobileBrowseSheetProps {
  onClose: () => void;
}

export default function MobileBrowseSheet({ onClose }: MobileBrowseSheetProps) {
  const { t, translateGenre, translateCountry } = useLanguage();

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 z-[60] bg-black/80 backdrop-blur-sm md:hidden"
      />
      <motion.div
        initial={{ y: '100%' }}
        animate={{ y: 0 }}
        exit={{ y: '100%' }}
        transition={{ type: 'spring', damping: 30, stiffness: 300 }}
        className="fixed bottom-0 left-0 right-0 z-[61] max-h-[80vh] overflow-y-auto bg-zinc-950 border-t border-zinc-800 rounded-t-2xl p-5 pb-10 space-y-6 md:hidden"
      >
        <div className="flex items-center justify-between">
          <span className="font-serif font-black italic text-sm uppercase tracking-wide text-[#E2B646]">{t('nav.browse')}</span>
          <button onClick={onClose} className="text-zinc-500 hover:text-white cursor-pointer"><X size={18} /></button>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <Link href="/" onClick={onClose} className="px-3 py-2.5 bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300 hover:border-[#E2B646] hover:text-[#E2B646] text-center">
            {t('nav.home')}
          </Link>
          <Link href="/type/phim-le" onClick={onClose} className="px-3 py-2.5 bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300 hover:border-[#E2B646] hover:text-[#E2B646] text-center">
            {t('nav.movies')}
          </Link>
          <Link href="/type/phim-bo" onClick={onClose} className="px-3 py-2.5 bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300 hover:border-[#E2B646] hover:text-[#E2B646] text-center">
            {t('nav.series')}
          </Link>
          <Link href="/type/hoat-hinh" onClick={onClose} className="px-3 py-2.5 bg-zinc-900/60 border border-zinc-850 text-xs text-zinc-300 hover:border-[#E2B646] hover:text-[#E2B646] text-center">
            {t('nav.anime')}
          </Link>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase font-serif tracking-[0.2em] font-bold text-[#E2B646]">{t('nav.genres')}</p>
          <div className="grid grid-cols-3 gap-2">
            {GENRES.map((g) => (
              <Link
                key={g.slug}
                href={g.href || `/category/${g.slug}`}
                onClick={onClose}
                className="px-2 py-2 text-[11px] text-zinc-400 hover:text-[#E2B646] border border-zinc-900 text-center truncate"
              >
                {g.name === 'Anime' ? g.name : translateGenre(g.name)}
              </Link>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <p className="text-[10px] uppercase font-serif tracking-[0.2em] font-bold text-[#E2B646]">{t('nav.countries')}</p>
          <div className="grid grid-cols-3 gap-2">
            {COUNTRIES.map((c) => (
              <Link
                key={c.slug}
                href={`/country/${c.slug}`}
                onClick={onClose}
                className="px-2 py-2 text-[11px] text-zinc-400 hover:text-[#E2B646] border border-zinc-900 text-center truncate"
              >
                {translateCountry(c.name)}
              </Link>
            ))}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
