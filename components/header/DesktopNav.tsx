'use client';

import Link from 'next/link';
import { useLanguage } from '@/hooks/useLanguage';
import { GENRES, COUNTRIES } from '@/lib/navLinks';

export default function DesktopNav() {
  const { t, translateGenre, translateCountry } = useLanguage();

  return (
    <nav className="hidden md:flex items-center space-x-7 text-[10px] uppercase tracking-[0.25em] text-zinc-400 font-bold flex-1 ml-10">
      <Link href="/" className="hover:text-[#E2B646] transition-colors py-2">{t('nav.home')}</Link>

      {/* Thể loại Dropdown (hover) */}
      <div className="relative group py-2">
        <span className="hover:text-[#E2B646] transition-colors cursor-pointer flex items-center gap-1.5">
          {t('nav.genres')} <span className="text-[7px] transform group-hover:rotate-180 transition-transform duration-250">▼</span>
        </span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:grid grid-cols-2 gap-x-8 gap-y-3 w-64 bg-zinc-950/95 backdrop-blur-md border border-zinc-900 p-4.5 shadow-2xl z-50 text-[9px]">
          {GENRES.map((g) => (
            <Link
              key={g.slug}
              href={g.href || `/category/${g.slug}`}
              className="hover:text-[#E2B646] transition-all hover:translate-x-1 duration-150 transform"
            >
              {g.name === 'Anime' ? g.name : translateGenre(g.name)}
            </Link>
          ))}
        </div>
      </div>

      {/* Quốc gia Dropdown (hover) */}
      <div className="relative group py-2">
        <span className="hover:text-[#E2B646] transition-colors cursor-pointer flex items-center gap-1.5">
          {t('nav.countries')} <span className="text-[7px] transform group-hover:rotate-180 transition-transform duration-250">▼</span>
        </span>
        <div className="absolute top-full left-1/2 -translate-x-1/2 hidden group-hover:grid grid-cols-1 gap-y-3 w-40 bg-zinc-950/95 backdrop-blur-md border border-zinc-900 p-4.5 shadow-2xl z-50 text-[9px]">
          {COUNTRIES.map((c) => (
            <Link
              key={c.slug}
              href={`/country/${c.slug}`}
              className="hover:text-[#E2B646] transition-all hover:translate-x-1 duration-150 transform"
            >
              {translateCountry(c.name)}
            </Link>
          ))}
        </div>
      </div>

      <Link href="/type/phim-le" className="hover:text-[#E2B646] transition-colors py-2">{t('nav.movies')}</Link>
      <Link href="/type/phim-bo" className="hover:text-[#E2B646] transition-colors py-2">{t('nav.series')}</Link>
    </nav>
  );
}
