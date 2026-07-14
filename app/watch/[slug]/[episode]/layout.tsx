import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/constants';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string; episode: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug, episode } = await params;

  try {
    const res = await api.getMovieDetail(slug);
    if (!res.status || !res.movie) {
      return { title: `Watch | ${SITE_CONFIG.name}` };
    }

    const movie = res.movie;
    const epNum = episode.replace('tap-', '');
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cide.konnn04.dev';
    const ogParams = new URLSearchParams({
      name: movie.name,
      origin_name: movie.origin_name || '',
      year: String(movie.year),
      quality: movie.quality || '',
      genre: movie.category?.[0]?.name || '',
      poster: movie.poster_url || '',
      type: 'watch',
      episode: epNum,
    });

    return {
      title: `${movie.name} - Tập ${epNum}`,
      description: `Watching ${movie.name} - ep ${epNum}. ${movie.origin_name || ''} - ${movie.year} - ${movie.quality}.`,
      openGraph: {
        title: `${movie.name} - ep ${epNum}`,
        description: `Watching ${movie.name} - ep ${epNum}`,
        images: [{ url: `${siteUrl}/api/og?${ogParams.toString()}`, width: 1200, height: 630 }],
      },
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: `Watch | ${SITE_CONFIG.name}`, robots: { index: false, follow: false } };
  }
}

export default function WatchLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
