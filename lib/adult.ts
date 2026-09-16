import { useAdultContentStore } from '@/lib/stores/useAdultContentStore';

export const ADULT_CATEGORY_SLUG = 'phim-18';

export function isAdultMovie(movie?: { category?: { slug: string }[] | null } | null): boolean {
  return !!movie?.category?.some((c) => c.slug === ADULT_CATEGORY_SLUG);
}

export function isAdultVerified(): boolean {
  return useAdultContentStore.getState().verified;
}

export function setAdultVerified(): void {
  useAdultContentStore.getState().setVerified();
}

export function isAdultUnblurEnabled(): boolean {
  return useAdultContentStore.getState().unblurEnabled;
}

export function setAdultUnblurEnabled(value: boolean): void {
  useAdultContentStore.getState().setUnblurEnabled(value);
}
