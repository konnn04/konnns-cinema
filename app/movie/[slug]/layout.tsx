import type { Metadata } from 'next';
import { api } from '@/lib/api';
import { SITE_CONFIG } from '@/lib/constants';

interface LayoutProps {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
}

export async function generateMetadata({ params }: LayoutProps): Promise<Metadata> {
  const { slug } = await params;

  try {
    const res = await api.getMovieDetail(slug);
    if (!res.status || !res.movie) {
      return { title: SITE_CONFIG.name };
    }

    const movie = res.movie;
    const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://cine.konnn04.dev';
    const ogParams = new URLSearchParams({
      name: movie.name,
      origin_name: movie.origin_name || '',
      year: String(movie.year),
      quality: movie.quality || '',
      genre: movie.category?.[0]?.name || '',
      poster: movie.poster_url || '',
    });

    return {
      title: movie.name,
      description: `${movie.name} - ${movie.origin_name || ''} - ${movie.year} - ${movie.quality}. ${movie.content?.replace(/<[^>]*>/g, '').slice(0, 200) || ''}`,
      openGraph: {
        title: movie.name,
        description: `${movie.origin_name || movie.name} - ${movie.year}`,
        images: [{ url: `${siteUrl}/api/og?${ogParams.toString()}`, width: 1200, height: 630 }],
      },
      robots: { index: false, follow: false },
    };
  } catch {
    return { title: SITE_CONFIG.name, robots: { index: false, follow: false } };
  }
}

export default function MovieLayout({ children }: LayoutProps) {
  return <>{children}</>;
}
