import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { MovieItem } from '@/lib/api';

interface FavoritesState {
  favorites: MovieItem[];
  isFavorited: (slug: string) => boolean;
  toggleFavorite: (movie: MovieItem) => void;
}

// Only the fields a MovieCard actually needs to render are kept, so pinning a
// title doesn't bloat storage with the full detail payload.
function toMinimalMovie(movie: MovieItem): MovieItem {
  return {
    _id: movie._id,
    name: movie.name,
    slug: movie.slug,
    origin_name: movie.origin_name,
    thumb_url: movie.thumb_url,
    poster_url: movie.poster_url,
    year: movie.year,
    episode_current: movie.episode_current,
    quality: movie.quality,
    lang: movie.lang,
    modified: movie.modified,
    category: movie.category,
  };
}

export const useFavoritesStore = create<FavoritesState>()(
  persist(
    (set, get) => ({
      favorites: [],
      isFavorited: (slug) => get().favorites.some((m) => m.slug === slug),
      toggleFavorite: (movie) => set((state) => {
        const exists = state.favorites.some((m) => m.slug === movie.slug);
        return {
          favorites: exists
            ? state.favorites.filter((m) => m.slug !== movie.slug)
            : [...state.favorites, toMinimalMovie(movie)],
        };
      }),
    }),
    { name: 'cinema-favorites' }
  )
);
