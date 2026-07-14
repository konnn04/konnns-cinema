import { createOGImageResponse } from '@/lib/og-image';

export const runtime = 'edge';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);

  return createOGImageResponse({
    name: searchParams.get('name') || '',
    originName: searchParams.get('origin_name') || '',
    year: searchParams.get('year') || '',
    quality: searchParams.get('quality') || '',
    genre: searchParams.get('genre') || '',
    episode: searchParams.get('episode') || '',
    poster: searchParams.get('poster') || '',
    type: (searchParams.get('type') as 'movie' | 'watch') || 'movie',
  });
}
