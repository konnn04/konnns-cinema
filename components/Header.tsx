'use client';

import { useState, useEffect, Suspense } from 'react';
import Link from 'next/link';
import { Heart, History, Settings } from 'lucide-react';
import DesktopNav from './header/DesktopNav';
import SearchBox from './header/SearchBox';
import NotificationsBell from './header/NotificationsBell';
import LanguageToggle from './header/LanguageToggle';
import Image from 'next/image';

function HeaderContent() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 40);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 left-0 right-0 z-40 transition-all duration-300 select-none ${scrolled
          ? 'bg-cinema-bg/90 backdrop-blur-md border-b border-zinc-900/80 py-3 shadow-lg'
          : 'bg-gradient-to-b from-black/80 via-black/20 to-transparent py-5'
        }`}
    >
      <div className="max-w-7xl mx-auto px-4 sm:px-8 md:px-12 flex items-center justify-between gap-4">
        {}
        <Link href="/" className="flex items-center space-x-2 flex-none">
          <Image 
            src="/logo.png"
            width={98}
            height={98}
            alt='Konnn&gt;s Cinema'
          />
        </Link>

        <DesktopNav />

        {}
        <div className="flex items-center space-x-3 sm:space-x-5 flex-none">
          <SearchBox />

          <Link href="/favorites" className="hidden md:flex text-zinc-400 hover:text-[#E2B646] transition-colors" title="Favorites">
            <Heart size={16} />
          </Link>

          <Link href="/history" className="text-zinc-400 hover:text-[#E2B646] transition-colors relative" title="Watch History">
            <History size={16} />
          </Link>

          <NotificationsBell />

          <LanguageToggle />

          <Link href="/settings" className="text-zinc-400 hover:text-white transition-colors" title="Settings">
            <Settings size={16} />
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Header() {
  return (
    <Suspense fallback={
      <header className="fixed top-0 left-0 right-0 z-50 bg-cinema-bg/85 backdrop-blur-md border-b border-zinc-900/50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 md:h-20 flex items-center justify-between">
          <div className="w-32 h-6 bg-zinc-900/50 rounded animate-pulse" />
          <div className="w-48 h-8 bg-zinc-900/50 rounded animate-pulse" />
        </div>
      </header>
    }>
      <HeaderContent />
    </Suspense>
  );
}
