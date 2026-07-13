import type {Metadata} from 'next';
import {Outfit, Inter, JetBrains_Mono, Be_Vietnam_Pro} from 'next/font/google';
import {LanguageProvider} from '@/hooks/useLanguage';
import BackToTop from '@/components/BackToTop';
import './globals.css'; // Global styles

const outfit = Outfit({
  subsets: ['latin'],
  variable: '--font-outfit',
  weight: ['300', '400', '500', '600', '700', '800'],
});

const inter = Inter({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-sans',
});

const mono = JetBrains_Mono({
  subsets: ['latin'],
  variable: '--font-mono',
});

// Bold geometric sans with full Vietnamese glyph coverage, replacing the
// script-like Playfair Display previously used for titles/headings.
const serif = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

export const metadata: Metadata = {
  title: "Konnn's Cinema - Premium Movie Streaming Experience",
  description: "Explore and stream high-quality movies, series, anime, and TV shows on Konnn's Cinema. Enjoy a premium, ad-free watching experience with cinematic details.",
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${mono.variable} ${serif.variable} dark`}>
      <body suppressHydrationWarning className="bg-cinema-bg text-zinc-100 antialiased min-h-screen">
        <LanguageProvider>
          {children}
          <BackToTop />
        </LanguageProvider>
      </body>
    </html>
  );
}
