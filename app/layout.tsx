import type {Metadata} from 'next';
import {Outfit, Inter, JetBrains_Mono, Be_Vietnam_Pro} from 'next/font/google';
import {LanguageProvider} from '@/hooks/useLanguage';
import {AuthProvider} from '@/hooks/useAuth';
import {WatchPartyProvider} from '@/hooks/useWatchParty';
import BackToTop from '@/components/BackToTop';
import ToastManager from '@/components/ToastManager';
import CloudSyncManager from '@/components/CloudSyncManager';
import './globals.css'; 

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

const serif = Be_Vietnam_Pro({
  subsets: ['latin', 'vietnamese'],
  variable: '--font-serif',
  weight: ['400', '500', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
});

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL || 'http://localhost:3000';

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Konnn's Cinema",
    template: "%s | Konnn's Cinema",
  },
  description: "Khám phá và xem phim lẻ, phim bộ, anime trực tuyến trên Konnn's Cinema - nền tảng xem phim trực tuyến miễn phí.",
  openGraph: {
    siteName: "Konnn's Cinema",
    type: 'website',
    locale: 'vi_VN',
    images: ['/api/og'],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function RootLayout({children}: {children: React.ReactNode}) {
  return (
    <html lang="en" className={`${outfit.variable} ${inter.variable} ${mono.variable} ${serif.variable} dark`}>
      <body suppressHydrationWarning className="bg-cinema-bg text-zinc-100 antialiased min-h-screen">
        <LanguageProvider>
          <AuthProvider>
            <CloudSyncManager />
            <WatchPartyProvider>
              {children}
              <BackToTop />
              <ToastManager />
            </WatchPartyProvider>
          </AuthProvider>
        </LanguageProvider>
      </body>
    </html>
  );
}
