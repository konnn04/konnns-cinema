// Shared helpers for gating and censoring 18+ ("Phim 18+", slug: phim-18) content.
// Thin imperative wrappers over useAdultContentStore -- kept as plain functions
// (rather than requiring every call site to use the hook) since most callers
// check this from inside click handlers and render-time branches, not just
// component bodies. Use the store hook directly wherever reactive updates matter.

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

// Controls whether 18+ thumbnails render censored (default) or in the clear.
// Only takes effect once the user has also passed the age confirmation modal at least once.
export function isAdultUnblurEnabled(): boolean {
  return useAdultContentStore.getState().unblurEnabled;
}

export function setAdultUnblurEnabled(value: boolean): void {
  useAdultContentStore.getState().setUnblurEnabled(value);
}
