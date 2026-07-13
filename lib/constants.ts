/**
 * White-label constants for Konnn's Cinema branding.
 * Update these values to rebrand the entire application.
 */

export const SITE_CONFIG = {
  /** Website name displayed across the UI */
  name: "Konnn's Cinema",
  /** Short name for limited-space UI */
  shortName: "Konnn's Cinema",
  /** Default tagline / description */
  tagline: {
    vi: 'Trang xem phim trực tuyến',
    en: 'Online movie platform',
  },
  /** Base URL (set for production) */
  url: '',
  /** Copyright holder */
  copyright: `Konnn's Cinema`,
  /** Data source attribution */
  dataSource: {
    name: 'KKPhim (phimapi.com)',
    url: 'https://phimapi.com',
  },
  /** Whether this is a guest-only (non-authenticated) viewer */
  isGuestViewer: true,
} as const;

export const SEO_CONFIG = {
  /** Title template: %s will be replaced with page-specific title */
  titleTemplate: "%s | Konnn's Cinema",
  /** Default title for the home page */
  defaultTitle: "Konnn's Cinema",
  /** Default meta description */
  description: {
    vi: 'Trang xem phim trực tuyến với nhiều thể loại phim lẻ, phim bộ, anime và các bộ phim mới cập nhật.',
    en: 'Online movie platform featuring movies, series, anime, and the latest releases.',
  },
  /** Only allow indexing on the home page */
  robots: {
    home: 'index, follow',
    other: 'noindex, nofollow',
  },
} as const;
