import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/movie/', '/watch/', '/search/', '/favorites/', '/history/', '/settings/', '/category/', '/country/', '/type/', '/year/'],
      },
    ],
    sitemap: '',
  };
}
