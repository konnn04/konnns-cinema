'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';

export default function Footer() {
  const currentYear = new Date().getFullYear();
  const { t, language } = useLanguage();

  return (
    <footer className="relative bg-black border-t border-white/10 pt-12 pb-8 px-6 md:px-12 select-none overflow-hidden">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 border-b border-white/10 pb-8">
        {/* Brand info */}
        <div className="flex flex-col items-center md:items-start text-center md:text-left space-y-2">
          <Link href="/" className="flex items-center space-x-2">
            <span className="font-serif font-black tracking-[0.2em] uppercase italic text-lg text-[#E2B646] hover:text-white transition-all">
              KONNN&apos;S CINEMA
            </span>
          </Link>
          <p className="text-zinc-500 font-sans text-xs max-w-xs leading-relaxed">
            {t('footer.description')}
          </p>
        </div>

        {/* Links section */}
        <div className="flex flex-wrap justify-center gap-6 md:gap-10 text-[10px] uppercase tracking-[0.2em] text-zinc-400 font-bold">
          <Link href="/type/phim-le" className="hover:text-[#E2B646] transition-colors">{t('nav.movies')}</Link>
          <Link href="/type/phim-bo" className="hover:text-[#E2B646] transition-colors">{t('nav.series')}</Link>
          <Link href="/type/hoat-hinh" className="hover:text-[#E2B646] transition-colors">{t('nav.anime')}</Link>
          <Link href="/history" className="hover:text-[#E2B646] transition-colors">{t('nav.history')}</Link>
          <Link href="/favorites" className="hover:text-[#E2B646] transition-colors">{t('nav.favorites')}</Link>
          <Link href="/settings" className="hover:text-[#E2B646] transition-colors">{t('nav.settings')}</Link>
        </div>
      </div>

      {/* Mandatory Disclaimer & Credit Notice */}
      <div className="max-w-7xl mx-auto mt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-center sm:text-left">
        <div className="space-y-1">
          <p className="text-zinc-500 font-mono text-[10px] leading-relaxed">
            {t('footer.data_source')}{' '}
            <a href="https://phimapi.com" target="_blank" rel="noreferrer" className="text-zinc-400 hover:text-[#E2B646] underline">
              KKPhim (phimapi.com)
            </a>.
          </p>
          <p className="text-zinc-600 font-sans text-[10px] leading-relaxed max-w-2xl">
            {t('footer.disclaimer')}
          </p>
        </div>

        <p className="text-zinc-600 font-mono text-[10px] whitespace-nowrap">
          &copy; {currentYear} Konnn&apos;s Cinema. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
