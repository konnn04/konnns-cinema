'use client';

import Link from 'next/link';
import { ServerEpisode } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

interface StreamSidebarProps {
  episodes: ServerEpisode[];
  activeServerIdx: number;
  onServerChange: (index: number) => void;
  slug: string;
  episodeSlug: string;
}

export default function StreamSidebar({ episodes, activeServerIdx, onServerChange, slug, episodeSlug }: StreamSidebarProps) {
  const { t } = useLanguage();
  const activeServerData = episodes[activeServerIdx]?.server_data;

  return (
    <div className="space-y-6">
      {episodes.length > 0 && (
        <div className="space-y-3">
          <span className="text-[10px] uppercase font-serif tracking-[0.2em] font-bold text-[#E2B646]">{t('watch.server_label')}</span>
          <div className="grid grid-cols-2 gap-2">
            {episodes.map((server, idx) => (
              <button
                key={server.server_name}
                onClick={() => onServerChange(idx)}
                className={`py-3 px-4 text-center rounded-none font-sans text-xs font-bold border transition-all cursor-pointer ${
                  idx === activeServerIdx
                    ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646]'
                    : 'border-zinc-850 bg-zinc-950/40 text-zinc-400 hover:text-zinc-250'
                }`}
              >
                {server.server_name}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="space-y-3">
          <span className="text-[10px] uppercase font-serif tracking-[0.2em] font-bold text-[#E2B646]">{t('watch.episode_catalog')}</span>
        <div className="p-4 bg-black/40 border border-zinc-850 rounded-none max-h-[380px] overflow-y-auto no-scrollbar">
          {activeServerData && activeServerData.length > 0 ? (
            <div className="grid grid-cols-4 gap-2">
              {activeServerData.map((ep) => {
                const isActive = ep.slug === episodeSlug;
                return (
                  <Link key={ep.slug} href={`/watch/${slug}/${ep.slug}?server=${activeServerIdx}`} className="col-span-1">
                    <button
                      className={`w-full py-2.5 text-center rounded-none text-xs font-mono font-bold border transition-all cursor-pointer ${
                        isActive
                          ? 'border-[#E2B646] bg-[#E2B646]/20 text-[#E2B646] shadow-inner'
                          : 'border-zinc-850 bg-zinc-900/15 text-zinc-500 hover:border-zinc-800 hover:text-zinc-300'
                      }`}
                    >
                      {ep.name}
                    </button>
                  </Link>
                );
              })}
            </div>
          ) : (
            <p className="p-6 text-center text-xs text-zinc-600">{t('watch.no_episodes_parsed')}</p>
          )}
        </div>
      </div>
    </div>
  );
}
