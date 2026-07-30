'use client';

import { use, useCallback, useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { Download, X, Loader2, MoveLeft, PlayCircle } from 'lucide-react';
import { api, MovieDetail, ServerEpisode, ServerData } from '@/lib/api';
import { useLanguage } from '@/hooks/useLanguage';
import { useHlsDownload } from '@/hooks/useHlsDownload';
import Header from '@/components/Header';
import Footer from '@/components/Footer';
import MobileNav from '@/components/MobileNav';

interface DownloadPageProps {
  params: Promise<{ slug: string; episode: string }>;
}

function sanitizeFilename(name: string): string {
  return name.replace(/[\\/:*?"<>|]+/g, ' ').replace(/\s+/g, ' ').trim();
}

export default function DownloadPage({ params }: DownloadPageProps) {
  const { slug, episode: episodeSlug } = use(params);
  const searchParams = useSearchParams();
  const serverIdx = parseInt(searchParams.get('server') || '0', 10);
  const { t } = useLanguage();

  const [movie, setMovie] = useState<MovieDetail | null>(null);
  const [episodes, setEpisodes] = useState<ServerEpisode[]>([]);
  const [loadError, setLoadError] = useState<string | null>(null);

  const { status, progress, error, start, cancel } = useHlsDownload();

  useEffect(() => {
    let cancelled = false;
    api.getMovieDetail(slug)
      .then((res) => {
        if (cancelled) return;
        if (res.status && res.movie) {
          setMovie(res.movie);
          setEpisodes(res.episodes || []);
        } else {
          setLoadError(t('download.movie_not_found'));
        }
      })
      .catch(() => {
        if (!cancelled) setLoadError(t('download.movie_not_found'));
      });
    return () => { cancelled = true; };
  }, [slug, t]);

  const activeServerData = (episodes[serverIdx] || episodes[0])?.server_data;
  const currentEpisode: ServerData | null =
    activeServerData?.find((e) => e.slug === episodeSlug) || activeServerData?.[0] || null;

  const handleStart = useCallback(() => {
    if (!currentEpisode?.link_m3u8 || !movie) return;
    const filename = `${sanitizeFilename(movie.name)} - Tap ${sanitizeFilename(currentEpisode.name)}.mp4`;
    start(currentEpisode.link_m3u8, filename);
  }, [currentEpisode, movie, start]);

  const isBusy = status === 'parsing' || status === 'downloading' || status === 'finalizing';
  const percent = progress.total > 0 ? Math.round((progress.completed / progress.total) * 100) : 0;
  const watchHref = `/watch/${slug}/${episodeSlug}?server=${serverIdx}`;

  return (
    <div className="relative min-h-screen bg-[#060608] text-zinc-100 select-none pb-20 md:pb-0">
      <Header />

      <main className="pt-24 max-w-2xl mx-auto px-4 sm:px-8 py-8 space-y-6">
        <Link
          href={watchHref}
          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 border border-zinc-800 hover:border-[#E2B646] text-zinc-400 hover:text-[#E2B646] text-[9px] font-mono font-bold uppercase tracking-wider transition-all"
        >
          <MoveLeft size={11} />
          {t('download.back_to_player')}
        </Link>

        {loadError && <p className="text-sm text-red-400 font-mono">{loadError}</p>}

        {movie && (
          <div className="space-y-1">
            <h1 className="font-serif font-black italic text-xl text-white">{movie.name}</h1>
            {currentEpisode && (
              <p className="text-xs font-mono text-zinc-500 uppercase tracking-wider">
                {t('watch.episode_catalog')} {currentEpisode.name}
              </p>
            )}
          </div>
        )}

        <div className="p-6 bg-black/40 border border-zinc-850 space-y-4">
          {movie && !currentEpisode?.link_m3u8 && (
            <p className="text-xs text-amber-400 font-mono">{t('download.link_unavailable')}</p>
          )}

          {status === 'idle' && (
            <button
              onClick={handleStart}
              disabled={!currentEpisode?.link_m3u8}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#E2B646] text-black font-bold text-xs uppercase tracking-wider disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer hover:bg-[#E2B646]/90 transition-all"
            >
              <Download size={14} />
              {t('download.start')}
            </button>
          )}

          {isBusy && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
                <span className="flex items-center gap-2">
                  <Loader2 size={13} className="animate-spin" />
                  {status === 'parsing' && t('download.status_parsing')}
                  {status === 'downloading' &&
                    t('download.status_downloading', { completed: progress.completed, total: progress.total })}
                  {status === 'finalizing' && t('download.status_finalizing')}
                </span>
                <span>{percent}%</span>
              </div>
              <div className="h-1.5 bg-zinc-900 overflow-hidden">
                <div className="h-full bg-[#E2B646] transition-all" style={{ width: `${percent}%` }} />
              </div>
              <p className="text-[10px] text-zinc-600 font-mono">{(progress.bytes / (1024 * 1024)).toFixed(1)} MB</p>
              <button
                onClick={cancel}
                className="flex items-center gap-1.5 px-3 py-1.5 border border-zinc-800 text-zinc-400 hover:text-red-400 hover:border-red-400/40 text-[10px] font-mono font-bold uppercase tracking-wider cursor-pointer transition-all"
              >
                <X size={12} />
                {t('download.cancel')}
              </button>
            </div>
          )}

          {status === 'done' && <p className="text-xs text-emerald-400 font-mono">{t('download.status_done')}</p>}
          {status === 'cancelled' && <p className="text-xs text-zinc-500 font-mono">{t('download.status_cancelled')}</p>}
          {status === 'error' && <p className="text-xs text-red-400 font-mono">{error || t('download.status_error')}</p>}

          <p className="text-[10px] text-zinc-600 font-mono leading-relaxed pt-3 border-t border-zinc-900">
            {t('download.warning_ram')}
          </p>
        </div>

        <Link
          href={watchHref}
          className="flex items-center gap-1.5 text-xs text-zinc-500 hover:text-[#E2B646] transition-all w-fit"
        >
          <PlayCircle size={14} />
          {t('download.watch_instead')}
        </Link>
      </main>

      <Footer />
      <MobileNav />
    </div>
  );
}
