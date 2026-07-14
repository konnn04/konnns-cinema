// Type definitions for KKPhim API (phimapi.com)

export interface TMDBInfo {
  id: string | null;
  type: string | null;
  season?: number | null;
  vote_average: number;
  vote_count: number;
}

export interface IMDBInfo {
  id: string | null;
  vote_average: number;
  vote_count: number;
}

export interface CategoryItem {
  id: string;
  name: string;
  slug: string;
}

// "Hoạt Hình" (anime) is a `type` in the KKPhim API (danh-sach/hoat-hinh), not
// a genre returned by /the-loai. This lets personalization UIs (onboarding,
// settings) offer it alongside real genres without pretending it's one.
export const ANIME_PSEUDO_GENRE: CategoryItem = {
  id: 'pseudo-anime',
  name: 'Hoạt Hình',
  slug: 'hoat-hinh',
};

export interface CountryItem {
  id: string;
  name: string;
  slug: string;
}

export interface MovieItem {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  thumb_url: string;
  poster_url: string;
  year: number;
  modified?: {
    time: string;
  };
  type?: string;
  episode_current?: string;
  quality?: string;
  lang?: string;
  time?: string;
  status?: string;
  showtimes?: string;
  chieurap?: boolean;
  sub_docquyen?: boolean;
  category?: CategoryItem[];
  country?: CountryItem[];
  tmdb?: TMDBInfo;
  imdb?: IMDBInfo;
}

export interface PaginationInfo {
  totalItems: number;
  totalItemsPerPage: number;
  currentPage: number;
  totalPages?: number;
  pageRanges?: number;
}

export interface APIListResponse {
  status: boolean | string;
  msg?: string;
  message?: string;
  items?: MovieItem[];
  pathImage?: string;
  pagination: PaginationInfo;
  data?: {
    items: MovieItem[];
    params?: any;
    pagination: PaginationInfo;
  };
}

export interface ServerData {
  name: string;
  slug: string;
  filename: string;
  link_embed: string;
  link_m3u8: string;
}

export interface ServerEpisode {
  server_name: string;
  is_ai: boolean;
  server_data: ServerData[];
}

export interface MovieDetail {
  _id: string;
  name: string;
  slug: string;
  origin_name: string;
  alternative_names?: string[];
  content: string;
  type: string;
  status: string;
  thumb_url: string;
  poster_url: string;
  is_copyright: boolean;
  sub_docquyen: boolean;
  chieurap: boolean;
  is_published: boolean;
  trailer_url: string;
  time: string;
  episode_current: string;
  episode_total: number | string;
  quality: string;
  lang: string;
  notify?: string;
  showtimes?: string;
  year: number;
  view: number;
  actor: string[];
  director: string[];
  category: CategoryItem[];
  country: CountryItem[];
  created?: { time: string };
  modified?: { time: string };
  tmdb?: TMDBInfo;
  imdb?: IMDBInfo;
}

export interface MovieDetailResponse {
  status: boolean;
  msg?: string;
  movie: MovieDetail;
  episodes: ServerEpisode[];
}

export interface FilterParams {
  category?: string;
  country?: string;
  year?: string | number;
  sort_field?: 'modified.time' | '_id' | 'year';
  sort_type?: 'desc' | 'asc';
  sort_lang?: 'vietsub' | 'thuyet-minh' | 'long-tieng';
}

const DEFAULT_PAGINATION: PaginationInfo = { totalItems: 0, totalItemsPerPage: 24, currentPage: 1 };

const BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL || 'https://phimapi.com';
const IMAGE_CDN_URL = process.env.NEXT_PUBLIC_IMAGE_CDN_URL || 'https://phimimg.com/upload/vod/';
const IMAGE_CDN_ORIGIN = IMAGE_CDN_URL.replace(/\/upload\/vod\/?$/, '');

export function resolveImageUrl(url: string | undefined, pathImage?: string): string {
  if (!url) {
    return '';
  }

  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url;
  }

  if (url.startsWith('upload/')) {
    return `${IMAGE_CDN_ORIGIN}/${url}`;
  }

  if (url.startsWith('/upload/')) {
    return `${IMAGE_CDN_ORIGIN}${url}`;
  }

  if (url.startsWith('uploads/') || url.startsWith('/uploads/')) {
    const clean = url.startsWith('/') ? url : `/${url}`;
    return `${IMAGE_CDN_ORIGIN}${clean}`;
  }

  const base = pathImage || IMAGE_CDN_URL;
  const cleanBase = base.endsWith('/') ? base : `${base}/`;
  const cleanUrl = url.startsWith('/') ? url.slice(1) : url;
  
  return `${cleanBase}${cleanUrl}`;
}

async function fetchAPI<T>(endpoint: string, options?: RequestInit): Promise<T> {
  const url = endpoint.startsWith('http') ? endpoint : `${BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        accept: 'application/json',
      },
      next: { revalidate: 600 }, 
      ...options,
    });
    
    if (!res.ok) {
      throw new Error(`Failed to fetch API from ${url}. Status: ${res.status}`);
    }
    
    return await res.json() as T;
  } catch (error) {
    console.error(`API Fetch Error [${url}]:`, error);
    throw error;
  }
}

export const api = {
  /**
   * Get recently updated movies
   * v1 list: /v1/api/danh-sach?page={page}
   */
  async getRecentlyUpdated(page: number = 1): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    const res = await fetchAPI<APIListResponse>(`/v1/api/danh-sach?page=${page}`);
    if (res.status === 'success' && res.data) {
      return {
        items: res.data.items,
        pagination: res.data.pagination || DEFAULT_PAGINATION,
        pathImage: IMAGE_CDN_URL,
      };
    }

    const classic = await fetchAPI<any>(`/danh-sach/phim-moi-cap-nhat?page=${page}`);
    return {
      items: classic.items || [],
      pagination: classic.pagination || DEFAULT_PAGINATION,
      pathImage: classic.pathImage || IMAGE_CDN_URL,
    };
  },

  /**
   * Get homepage curated data (movies updated today)
   * /v1/api/home
   */
  async getHomeMovies(page: number = 1): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    try {
      const res = await fetchAPI<any>(`/v1/api/home?page=${page}`);
      return {
        items: res.items || [],
        pagination: res.pagination || DEFAULT_PAGINATION,
        pathImage: res.pathImage || IMAGE_CDN_URL,
      };
    } catch {
      return this.getRecentlyUpdated(page);
    }
  },

  /**
   * Get movies by type (phim-le, phim-bo, hoat-hinh, tv-shows) with full filtering
   * v1 format: /v1/api/danh-sach/{type}
   */
  async getMoviesByType(
    type: 'phim-le' | 'phim-bo' | 'hoat-hinh' | 'tv-shows',
    page: number = 1,
    filters?: FilterParams
  ): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    let query = `page=${page}`;
    if (filters) {
      if (filters.category) query += `&category=${filters.category}`;
      if (filters.country) query += `&country=${filters.country}`;
      if (filters.year) query += `&year=${filters.year}`;
      if (filters.sort_field) query += `&sort_field=${filters.sort_field}`;
      if (filters.sort_type) query += `&sort_type=${filters.sort_type}`;
      if (filters.sort_lang) query += `&sort_lang=${filters.sort_lang}`;
    }

    const res = await fetchAPI<APIListResponse>(`/v1/api/danh-sach/${type}?${query}`);
    if (res.status === true || res.status === 'success') {
      const data = res.data;
      return {
        items: data?.items || [],
        pagination: data?.pagination || { totalItems: 0, totalItemsPerPage: 24, currentPage: 1 },
        pathImage: IMAGE_CDN_URL,
      };
    }

    const classic = await fetchAPI<any>(`/danh-sach/${type}?page=${page}`);
    return {
      items: classic.items || [],
      pagination: classic.pagination || DEFAULT_PAGINATION,
      pathImage: classic.pathImage || IMAGE_CDN_URL,
    };
  },

  /**
   * Get movie detailed information by slug
   * /phim/{slug}
   */
  async getMovieDetail(slug: string): Promise<MovieDetailResponse> {
    return await fetchAPI<MovieDetailResponse>(`/phim/${slug}`);
  },

  /**
   * Search movies by keyword
   * /v1/api/tim-kiem?keyword={keyword}&limit={limit}&page={page}
   */
  async searchMovies(
    keyword: string,
    page: number = 1,
    limit: number = 12,
    filters?: FilterParams
  ): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    let query = `keyword=${encodeURIComponent(keyword)}&page=${page}&limit=${limit}`;
    if (filters) {
      if (filters.category) query += `&category=${filters.category}`;
      if (filters.country) query += `&country=${filters.country}`;
      if (filters.year) query += `&year=${filters.year}`;
    }
    
    const res = await fetchAPI<APIListResponse>(`/v1/api/tim-kiem?${query}`);
    if (res.status === 'success' && res.data) {
      return {
        items: res.data.items || [],
        pagination: res.data.pagination || DEFAULT_PAGINATION,
        pathImage: IMAGE_CDN_URL,
      };
    }

    return {
      items: [],
      pagination: { totalItems: 0, totalItemsPerPage: limit, currentPage: 1 },
      pathImage: IMAGE_CDN_URL,
    };
  },

  /**
   * Get list of genres
   * /the-loai
   */
  async getGenres(): Promise<CategoryItem[]> {
    const res = await fetchAPI<any>('/the-loai');
    if (res.status === 'success' && res.data && res.data.items) {
      // This endpoint returns `_id` instead of the `id` field used everywhere
      // else in the API (e.g. category objects embedded in movie items).
      return res.data.items.map((item: any) => ({ ...item, id: item.id ?? item._id }));
    }
    return [];
  },

  /**
   * Get list of countries
   * /quoc-gia
   */
  async getCountries(): Promise<CountryItem[]> {
    const res = await fetchAPI<any>('/quoc-gia');
    if (res.status === 'success' && res.data && res.data.items) {
      // Same `_id` vs `id` inconsistency as the genres endpoint above.
      return res.data.items.map((item: any) => ({ ...item, id: item.id ?? item._id }));
    }
    return [];
  },

  /**
   * Get list of years
   * /nam-phat-hanh
   */
  async getYears(): Promise<number[]> {
    try {
      const res = await fetchAPI<any>('/nam-phat-hanh');
      if (res.status === 'success' && res.data && res.data.items) {
        return res.data.items.map((item: any) => item.year);
      }
    } catch {
      // Return fallback years if endpoint fails
    }
    const currentYear = new Date().getFullYear();
    const years = [];
    for (let y = currentYear; y >= 2010; y--) {
      years.push(y);
    }
    return years;
  },

  /**
   * Get movies by genre slug
   * /v1/api/the-loai/{slug}
   */
  async getMoviesByGenre(
    genreSlug: string,
    page: number = 1,
    filters?: FilterParams
  ): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    let query = `page=${page}`;
    if (filters) {
      if (filters.country) query += `&country=${filters.country}`;
      if (filters.year) query += `&year=${filters.year}`;
    }
    const res = await fetchAPI<APIListResponse>(`/v1/api/the-loai/${genreSlug}?${query}`);
    if (res.status === true && res.data) {
      return {
        items: res.data.items || [],
        pagination: res.data.pagination || DEFAULT_PAGINATION,
        pathImage: IMAGE_CDN_URL,
      };
    }
    return {
      items: [],
      pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: 1 },
      pathImage: IMAGE_CDN_URL,
    };
  },

  /**
   * Get movies by country slug
   * /v1/api/quoc-gia/{slug}
   */
  async getMoviesByCountry(
    countrySlug: string,
    page: number = 1,
    filters?: FilterParams
  ): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    let query = `page=${page}`;
    if (filters) {
      if (filters.category) query += `&category=${filters.category}`;
      if (filters.year) query += `&year=${filters.year}`;
    }
    const res = await fetchAPI<APIListResponse>(`/v1/api/quoc-gia/${countrySlug}?${query}`);
    if (res.status === true && res.data) {
      return {
        items: res.data.items || [],
        pagination: res.data.pagination || DEFAULT_PAGINATION,
        pathImage: IMAGE_CDN_URL,
      };
    }
    return {
      items: [],
      pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: 1 },
      pathImage: IMAGE_CDN_URL,
    };
  },

  /**
   * Get movies by year
   * /v1/api/nam/{year}
   */
  async getMoviesByYear(
    year: number | string,
    page: number = 1,
    filters?: FilterParams
  ): Promise<{ items: MovieItem[]; pagination: PaginationInfo; pathImage: string }> {
    let query = `page=${page}`;
    if (filters) {
      if (filters.category) query += `&category=${filters.category}`;
      if (filters.country) query += `&country=${filters.country}`;
    }
    const res = await fetchAPI<APIListResponse>(`/v1/api/nam/${year}?${query}`);
    if (res.status === true && res.data) {
      return {
        items: res.data.items || [],
        pagination: res.data.pagination || DEFAULT_PAGINATION,
        pathImage: IMAGE_CDN_URL,
      };
    }
    return {
      items: [],
      pagination: { totalItems: 0, totalItemsPerPage: 24, currentPage: 1 },
      pathImage: IMAGE_CDN_URL,
    };
  }
};
