<div align="center">
  <br/>
  <h1>🎬 Konnn's Cinema</h1>
  <p>
    <strong>A modern, self-hosted movie streaming platform built with Next.js</strong>
  </p>
  <p>
    <img alt="Next.js" src="https://img.shields.io/badge/Next.js_16-000000?style=flat-square&logo=next.js&logoColor=white"/>
    <img alt="React" src="https://img.shields.io/badge/React_19-61DAFB?style=flat-square&logo=react&logoColor=black"/>
    <img alt="TypeScript" src="https://img.shields.io/badge/TypeScript-3178C6?style=flat-square&logo=typescript&logoColor=white"/>
    <img alt="Tailwind" src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwind-css&logoColor=white"/>
    <img alt="pnpm" src="https://img.shields.io/badge/pnpm-F69220?style=flat-square&logo=pnpm&logoColor=white"/>
    <img alt="License" src="https://img.shields.io/badge/License-MIT-green?style=flat-square"/>
    <img alt="Firebase" src="https://img.shields.io/badge/Firebase-FFCA28?style=flat-square&logo=firebase&logoColor=black"/>
  </p>
  <br/>
</div>

---

## ✨ Features

- 🎥 **Stream movies & series** — Powered by [KKPhim API](https://phimapi.com) with multiple server sources
- 👥 **Watch Together** — Real-time synchronized viewing with friends via Firebase (chat, reactions, playback sync)
- 🌐 **Bilingual UI** — Full Vietnamese & English support with hot-switchable translations (JSON-based i18n)
- 📺 **Adaptive player** — HLS streaming, Picture-in-Picture, keyboard shortcuts, playback speed, theater mode
- 📚 **Watch history** — Auto-saves progress across sessions via Zustand + localStorage
- ❤️ **Favorites board** — Pin movies for quick access
- 🎬 **Anime metadata** — Auto-fetches episode counts, scores, studios & airing schedules from [AniList](https://anilist.co)
- 🔍 **Advanced search** — Filter by genre, country, year with multiple sort modes
- 📱 **Responsive** — Mobile-first design with bottom navigation
- 🎨 **Cinematic UI** — Dark theme, smooth animations (Motion), custom scrollbars, ticket-styled design
- 🔒 **Adult content gate** — Optional age verification for mature titles
- 🧪 **Experimental WebGPU** — Frame interpolation & FSR upscaling (beta)
- 🔔 **Toast notifications** — Custom toast system with color-coded states (success/error/warning/info) + confirm dialogs
- 🖼️ **Dynamic OG images** — Auto-generated ticket-style share images per movie via `next/og`
- ⚙️ **White-label ready** — Centralized `lib/constants.ts` for site name, SEO, and branding
- 🔎 **SEO optimized** — Dynamic metadata per page, sitemap, robots.txt, `generateMetadata` for SSR

## 🚀 Tech Stack

| Layer | Technology |
|-------|-----------|
| **Framework** | [Next.js 16](https://nextjs.org/) (Turbopack) |
| **UI Library** | [React 19](https://react.dev/) |
| **Language** | [TypeScript](https://www.typescriptlang.org/) |
| **Styling** | [Tailwind CSS](https://tailwindcss.com/) |
| **Animation** | [Motion](https://motion.dev/) (formerly Framer Motion) |
| **State** | [Zustand](https://zustand-demo.pmnd.rs/) + `persist` middleware |
| **Video** | [HLS.js](https://github.com/video-dev/hls.js/) |
| **Icons** | [Lucide](https://lucide.dev/) |
| **Fonts** | Outfit, Inter, JetBrains Mono, Be Vietnam Pro |
| **Package** | [pnpm](https://pnpm.io/) |
| **Data source** | [KKPhim API](https://phimapi.com) |
| **Anime metadata** | [AniList GraphQL API](https://docs.anilist.co/) |
| **Real-time** | [Firebase Realtime Database](https://firebase.google.com/) (Watch Party) |
| **OG Images** | [`@vercel/og`](https://vercel.com/docs/functions/edge-functions/og-image-generation) (Edge) |

## 📦 Project Structure

```
konnns-cinema/
├── app/                    # Next.js App Router pages + layouts
│   ├── movie/[slug]/       # Movie detail page + server layout (SEO)
│   ├── watch/[slug]/       # Video player + Watch Party + server layout (SEO)
│   ├── search/             # Search & filter catalog
│   ├── favorites/          # Pinned movies
│   ├── history/            # Watch history
│   ├── settings/           # User preferences
│   ├── api/og/             # Dynamic OG image generation (Edge)
│   ├── sitemap.ts          # Sitemap (homepage only)
│   └── robots.ts           # Robots.txt (block non-home pages)
├── components/
│   ├── header/             # Navigation & search
│   ├── movie/              # Movie-specific (CinemaTicket, EpisodeGrid, CastCrew, etc.)
│   ├── player/             # Video player (controls, overlays, settings, SkipIntro)
│   └── watchparty/         # Watch Together (panel, chat, reactions, floating comments)
├── hooks/                  # Custom React hooks
├── lib/
│   ├── locales/            # i18n JSON files (vi.json, en.json)
│   ├── stores/             # Zustand stores (favorites, history, preferences, watch party)
│   ├── watchParty/         # Firebase RTDB types, constants, room code utils
│   ├── api.ts              # KKPhim API client
│   ├── anime.ts            # AniList GraphQL API client
│   ├── constants.ts        # White-label config (SITE_CONFIG, SEO_CONFIG)
│   ├── og-image.tsx         # OG image generator (ticket-style)
│   └── toast.tsx           # Toast notification system
├── public/                 # Static assets
├── watch-party-server/     # Standalone WebSocket server (alternative to Firebase)
└── .github/                # PR templates
```

## 🛠️ Getting Started

### Prerequisites

- **Node.js** 18+
- **pnpm** (recommended) or npm

### Installation

```bash
# Clone the repository
git clone https://github.com/konnn04/konnns-cinema.git
cd konnns-cinema

# Install dependencies
pnpm install

# Start development server
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.  
The app uses the public KKPhim API by default — no API keys required.

### Build for Production

```bash
pnpm build
pnpm start
```

## 🌐 Internationalization

Translations are stored as JSON files in `lib/locales/`:

```
lib/locales/
├── vi.json    # Vietnamese (default, 180+ keys)
└── en.json    # English
```

To add a new language:
1. Create `lib/locales/{lang}.json` with the same keys
2. Import it in `hooks/useLanguage.tsx`
3. Add it to the `TRANSLATIONS` record

## 👥 Watch Together (Xem Phim Chung)

Real-time synchronized movie watching with friends:

- **Create/Join rooms** with a 6-character code
- **Synchronized playback** — play, pause, seek stays in sync for all members
- **Built-in chat** — real-time messaging alongside the video
- **Floating reactions & comments** — danmaku-style overlay on the video
- **Host controls** — only the host can control playback (configurable)
- **Auto-reconnect** — rejoins your last room on return
- **Firebase RTDB** or **WebSocket server** (standalone mode)

```bash
# Start the standalone WebSocket party server (alternative to Firebase)
pnpm party-server

# Run both servers concurrently
pnpm dev:all
```

## 🎯 Usage

1. **Browse** — Homepage shows trending, recently updated & personalized rows (adapts to favorite genres)
2. **Search** — Use the search bar or filter panel (genre / country / year)
3. **Watch** — Click any movie → select a server → pick an episode
4. **Watch Together** — Toggle "Xem Phim Chung" in the sidebar → create a room → share the code
5. **Track** — Progress auto-saves; resume anytime from History
6. **Pin** — Heart icon saves movies to your Favorites board

### Keyboard Shortcuts (Player)

| Key | Action |
|-----|--------|
| `Space` | Play / Pause |
| `F` | Fullscreen toggle |
| `M` | Mute toggle |
| `←` / `→` | Seek backward / forward |

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feat/amazing-feature`)
3. Commit your changes
4. Open a Pull Request using the [PR template](.github/PULL_REQUEST_TEMPLATE.md)

## ⚠️ Disclaimer

This platform is built exclusively for **research, learning, and non-commercial technical demonstration**. No movie files are hosted, owned, or stored on this server. All content is sourced from third-party provider APIs ([KKPhim](https://phimapi.com)).

## 📄 License

[MIT](LICENSE) &copy; 2026 Konnn's Cinema
