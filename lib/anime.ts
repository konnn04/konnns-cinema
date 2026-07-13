export interface AnimeInfo {
  id: number;
  title: {
    romaji: string;
    english: string | null;
    native: string | null;
  };
  episodes: number | null;
  duration: number | null;
  status: string | null;
  description: string | null;
  startDate: { year: number | null; month: number | null; day: number | null };
  endDate: { year: number | null; month: number | null; day: number | null };
  nextAiringEpisode: {
    airingAt: number;
    timeUntilAiring: number;
    episode: number;
  } | null;
  genres: string[];
  averageScore: number | null;
  meanScore: number | null;
  source: string | null;
  studios: string[];
  format: string | null;
  bannerImage: string | null;
  coverImage: {
    large: string | null;
    medium: string | null;
  };
  trailer: {
    id: string;
    site: string;
    thumbnail: string | null;
  } | null;
}

const ANILIST_API = 'https://graphql.anilist.co';

const SEARCH_QUERY = `
  query ($search: String, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
      media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
        id
        title {
          romaji
          english
          native
        }
        episodes
        duration
        status
        description(asHtml: false)
        startDate { year month day }
        endDate { year month day }
        nextAiringEpisode {
          airingAt
          timeUntilAiring
          episode
        }
        genres
        averageScore
        meanScore
        source
        format
        bannerImage
        coverImage {
          large
          medium
        }
        trailer {
          id
          site
          thumbnail
        }
        studios(isMain: true) {
          nodes {
            name
          }
        }
      }
    }
  }
`;

export async function searchAnime(originName: string): Promise<AnimeInfo | null> {
  if (!originName || originName.trim().length === 0) return null;

  try {
    const response = await fetch(ANILIST_API, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
      },
      body: JSON.stringify({
        query: SEARCH_QUERY,
        variables: {
          search: originName.trim(),
          page: 1,
          perPage: 5,
        },
      }),
    });

    if (!response.ok) {
      console.warn(`AniList API error: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const mediaList = data?.data?.Page?.media;
    if (!mediaList || mediaList.length === 0) return null;

    const best = mediaList[0];
    return formatAnimeInfo(best);
  } catch (err) {
    console.warn('Failed to fetch from AniList:', err);
    return null;
  }
}

function formatAnimeInfo(raw: any): AnimeInfo {
  return {
    id: raw.id,
    title: {
      romaji: raw.title?.romaji || '',
      english: raw.title?.english || null,
      native: raw.title?.native || null,
    },
    episodes: raw.episodes ?? null,
    duration: raw.duration ?? null,
    status: raw.status || null,
    description: raw.description || null,
    startDate: raw.startDate || { year: null, month: null, day: null },
    endDate: raw.endDate || { year: null, month: null, day: null },
    nextAiringEpisode: raw.nextAiringEpisode || null,
    genres: raw.genres || [],
    averageScore: raw.averageScore ?? null,
    meanScore: raw.meanScore ?? null,
    source: raw.source || null,
    studios: raw.studios?.nodes?.map((n: any) => n.name) || [],
    format: raw.format || null,
    bannerImage: raw.bannerImage || null,
    coverImage: {
      large: raw.coverImage?.large || null,
      medium: raw.coverImage?.medium || null,
    },
    trailer: raw.trailer
      ? {
          id: raw.trailer.id,
          site: raw.trailer.site,
          thumbnail: raw.trailer.thumbnail || null,
        }
      : null,
  };
}

export function formatAnimeEpisodes(info: AnimeInfo): string {
  const total = info.episodes;
  const next = info.nextAiringEpisode;

  if (total && total > 0) {
    return `${total} tập`;
  }

  if (next) {
    return `Đang phát - Tập ${next.episode - 1}/?`;
  }

  return info.status === 'RELEASING' ? 'Đang phát' : 'Chưa rõ';
}

export function translateAnimeStatus(status: string | null, lang: 'vi' | 'en' = 'vi'): string {
  if (!status) return lang === 'vi' ? 'Chưa rõ' : 'Unknown';

  const map: Record<string, { vi: string; en: string }> = {
    FINISHED: { vi: 'Hoàn thành', en: 'Finished' },
    RELEASING: { vi: 'Đang phát sóng', en: 'Airing' },
    NOT_YET_RELEASED: { vi: 'Sắp ra mắt', en: 'Not yet aired' },
    CANCELLED: { vi: 'Đã hủy', en: 'Cancelled' },
    HIATUS: { vi: 'Tạm ngưng', en: 'On Hiatus' },
  };

  return map[status]?.[lang] || status;
}

export function translateAnimeFormat(format: string | null, lang: 'vi' | 'en' = 'vi'): string {
  if (!format) return '';

  const map: Record<string, { vi: string; en: string }> = {
    TV: { vi: 'TV', en: 'TV' },
    TV_SHORT: { vi: 'TV Short', en: 'TV Short' },
    MOVIE: { vi: 'Phim điện ảnh', en: 'Movie' },
    SPECIAL: { vi: 'Special', en: 'Special' },
    OVA: { vi: 'OVA', en: 'OVA' },
    ONA: { vi: 'ONA', en: 'ONA' },
    MUSIC: { vi: 'Music', en: 'Music' },
  };

  return map[format]?.[lang] || format;
}
export function formatNextAiringTime(airingAt: number, lang: 'vi' | 'en' = 'vi'): string {
  try {
    const date = new Date(airingAt * 1000);
    if (lang === 'vi') {
      const day = String(date.getDate()).padStart(2, '0');
      const month = String(date.getMonth() + 1).padStart(2, '0');
      const year = date.getFullYear();
      const hours = String(date.getHours()).padStart(2, '0');
      const mins = String(date.getMinutes()).padStart(2, '0');
      return `${day}/${month}/${year} ${hours}:${mins}`;
    } else {
      return date.toLocaleString('en-US', {
        month: 'short', day: 'numeric', year: 'numeric',
        hour: 'numeric', minute: '2-digit', hour12: true,
      });
    }
  } catch {
    return '';
  }
}
