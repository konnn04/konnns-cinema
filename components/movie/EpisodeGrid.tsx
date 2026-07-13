import { ServerEpisode } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';

interface EpisodeGridProps {
  episodes: ServerEpisode[];
  activeServerIdx: number;
  onServerChange: (index: number) => void;
  activeEpisodeSlug?: string;
  onEpisodeClick: (episodeSlug: string, episodeName: string) => void;
}

export default function EpisodeGrid({ episodes, activeServerIdx, onServerChange, activeEpisodeSlug, onEpisodeClick }: EpisodeGridProps) {
  const { t } = useLanguage();
  const activeServerData = episodes[activeServerIdx]?.server_data;

  return (
    <div className="space-y-6 pt-8 border-t border-zinc-900/80">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h3 className="font-serif font-black text-xl tracking-wide text-[#E2B646] uppercase italic">
            {t('episode.server_list')}
          </h3>
          <p className="text-[11px] text-zinc-550 font-sans mt-0.5">{t('episode.select_server')}</p>
        </div>

        <div className="flex flex-wrap gap-2">
          {episodes.map((server, idx) => (
            <button
              key={server.server_name}
              onClick={() => onServerChange(idx)}
              className={`px-4 py-2 rounded-none text-xs font-semibold tracking-wide border cursor-pointer transition-all ${
                idx === activeServerIdx
                  ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646]'
                  : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:text-zinc-200'
              }`}
            >
              {server.server_name}
            </button>
          ))}
        </div>
      </div>

      <div className="p-6 bg-black/40 border border-zinc-850 rounded-none">
        {activeServerData && activeServerData.length > 0 ? (
          <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-12 gap-3">
            {activeServerData.map((ep) => {
              const isEpisodeWatched = activeEpisodeSlug === ep.slug;
              return (
                <button
                  key={ep.slug}
                  onClick={() => onEpisodeClick(ep.slug, ep.name)}
                  className={`flex flex-col items-center justify-center py-3.5 rounded-none border text-center transition-all cursor-pointer relative overflow-hidden group ${
                    isEpisodeWatched
                      ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold shadow shadow-[#E2B646]/5'
                      : 'border-zinc-850 bg-zinc-900/30 text-zinc-400 hover:border-zinc-700 hover:text-zinc-200'
                  }`}
                >
                  <span className="font-mono text-sm tracking-wide">{ep.name}</span>
                  {isEpisodeWatched && (
                    <div className="absolute top-1 right-1 w-2.5 h-2.5 bg-[#E2B646] flex items-center justify-center shadow-lg animate-pulse" />
                  )}
                </button>
              );
            })}
          </div>
        ) : (
          <p className="p-8 text-center text-xs text-zinc-600">No episodes cataloged for this node</p>
        )}
      </div>
    </div>
  );
}
