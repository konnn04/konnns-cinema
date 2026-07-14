'use client';

import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Home, Compass, Search, History, Heart, Settings } from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import MobileBrowseSheet from './MobileBrowseSheet';

export default function MobileNav() {
  const pathname = usePathname();
  const { t } = useLanguage();
  const [showBrowse, setShowBrowse] = useState(false);

  const navItems = [
    {
      label: t('nav.home'),
      icon: Home,
      path: '/',
    },
    {
      label: t('nav.browse'),
      icon: Compass,
      onClick: () => setShowBrowse(true),
    },
    {
      label: t('nav.search'),
      icon: Search,
      path: '/search',
    },
    {
      label: t('nav.history'),
      icon: History,
      path: '/history',
    },
    {
      label: t('nav.favorites'),
      icon: Heart,
      path: '/favorites',
    },
    {
      label: t('nav.settings'),
      icon: Settings,
      path: '/settings',
    },
  ];

  return (
    <>
      <div className="fixed bottom-0 left-0 right-0 z-40 bg-zinc-950/95 backdrop-blur-md border-t border-zinc-900 px-2 py-2 flex items-center justify-around md:hidden safe-area-bottom pb-4 shadow-[0_-10px_20px_rgba(0,0,0,0.5)]">
        {navItems.map((item) => {
          const isActive = 'path' in item && pathname === item.path;
          const Icon = item.icon;

          const content = (
            <>
              <div
                className={`p-1.5 rounded-full transition-all duration-300 ${
                  isActive
                    ? 'text-brand-orange bg-brand-orange/10 scale-110 shadow-inner'
                    : 'text-zinc-500 hover:text-zinc-300'
                }`}
              >
                <Icon size={18} className={isActive ? 'stroke-[2.5px]' : 'stroke-[1.8px]'} />
              </div>
              <span
                className={`text-[9px] font-sans font-medium mt-0.5 tracking-wider transition-colors ${
                  isActive ? 'text-[#E2B646]' : 'text-zinc-500'
                }`}
              >
                {item.label}
              </span>
            </>
          );

          if ('onClick' in item) {
            return (
              <button
                key={item.label}
                type="button"
                onClick={item.onClick}
                className="flex flex-col items-center justify-center py-1 flex-1 cursor-pointer"
              >
                {content}
              </button>
            );
          }

          return (
            <Link
              key={item.path}
              href={item.path}
              className="flex flex-col items-center justify-center py-1 flex-1 cursor-pointer"
            >
              {content}
            </Link>
          );
        })}
      </div>

      {showBrowse && <MobileBrowseSheet onClose={() => setShowBrowse(false)} />}
    </>
  );
}
