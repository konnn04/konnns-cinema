# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

Konnn's Cinema — a Next.js 16 (App Router, Turbopack, React 19, TypeScript) movie streaming
frontend. It has no backend/database of its own: all catalog data comes from the public KKPhim
API (`phimapi.com`), anime metadata is enriched from AniList's GraphQL API, and Watch Together
real-time sync uses Firebase (Realtime Database + Auth). Built for research/demo purposes — see
the Disclaimer in README.md.

## Commands

Package manager is **pnpm** (`pnpm-lock.yaml` is the tracked lockfile — don't use `npm install`).

```bash
pnpm install       # install deps
pnpm dev           # dev server, Turbopack, http://localhost:3000
pnpm build         # production build (fails the build on TS errors — see next.config.ts)
pnpm start         # run the production build
pnpm lint          # eslint . (flat config extending eslint-config-next)
pnpm clean         # next clean
npx tsc --noEmit   # type-check only, no dedicated package.json script for this
```

There is no test suite/framework configured in this repo (no jest/vitest/playwright, no `test`
script). Don't assume one exists.

Before opening a PR (per `.github/PULL_REQUEST_TEMPLATE.md`): `pnpm build` must succeed, no new
TS errors, manually verify in a browser, add any new UI strings to **both**
`lib/locales/vi.json` and `lib/locales/en.json`, and add any new env var to `.env.example`.

## Environment

Copy `.env.example` to `.env`. Nothing is required to run locally — the app works against the
public KKPhim API with all values empty/default. Notable vars:

- `NEXT_PUBLIC_API_BASE_URL` / `NEXT_PUBLIC_IMAGE_CDN_URL` — swap the KKPhim API/CDN mirror.
- `PASSWORD` — enables a site-wide password gate when set (see below); unset = gate disabled.
- `NEXT_PUBLIC_FIREBASE_*` — needed only for Watch Together and cross-device sync; the rest of
  the app works without them.

## Architecture

### Dual TV / PC-mobile rendering

Konnn's Cinema targets both regular browsers and smart-TV browsers (D-pad/remote input) from one
codebase. `TVModeProvider` (`hooks/use-tv.tsx`) detects a TV environment (UA sniffing + coarse
pointer/no-hover + width heuristics), with a manual override in Settings persisted via
`usePreferencesStore`. Any component can read the result with `useIsTV()`.

Pages with meaningfully different TV vs. PC/mobile UX branch into two sibling components instead
of one component with inline conditionals — e.g. `app/watch/[slug]/[episode]/page.tsx` holds all
shared state/logic and renders either `components/watch/WatchPageTV.tsx` or
`components/watch/WatchPagePC.tsx`. Follow this split pattern rather than sprinkling
`isTV ? ... : ...` through a single large component.

TV layouts use `@noriginmedia/norigin-spatial-navigation` for D-pad focus, via
`hooks/useTVFocusable.ts` and the `components/tv/FocusableButton.tsx` wrapper (never a raw
`<button>` in a TV-facing view). Spatial nav is initialized with `shouldFocusDOMNode: false` —
focus visuals come entirely from norigin's `focused` state (`.tv-focus` class), not real DOM
focus — because giving these elements real focus double-fires their `onClick` when Enter is
pressed (browser's native Enter-triggers-click *plus* the manual click norigin does).

### Video player

`hooks/useVideoPlayer.ts` is the single source of truth for one `<video>` element (play/pause,
volume/mute persisted via `usePreferencesStore`, fullscreen, PiP, scrub state, mobile
orientation-triggered auto-fullscreen, keyboard shortcuts) and is shared by both the PC and TV
watch layouts. `app/watch/[slug]/[episode]/page.tsx` owns the actual HLS.js wiring (loads
`ServerData.link_m3u8`, retry/error handling, auto-next-episode, watch-history progress
snapshots to `useWatchHistoryStore`).

Experimental WebGPU effects — FSR upscaling (`anime4k-webgpu`), frame interpolation, an audio
enhancer — live in their own hooks (`useFsrUpscale`, `useFrameInterpolation`,
`useAudioEnhancer`), are gated behind `usePreferencesStore` beta flags, and self-disable via an
`onFatalError` callback if WebGPU isn't supported or errors at runtime.

### Client-side HLS downloader

`app/download/[slug]/[episode]/page.tsx` lets PC/mobile users save an episode's HLS stream as a
single file, entirely client-side (no ffmpeg/server transcoding). `lib/hlsDownload.ts` parses the
m3u8 (including master-playlist variant selection and AES-128 `#EXT-X-KEY` decryption via
`crypto.subtle`), fetches segments with bounded concurrency, and concatenates them into one Blob;
`hooks/useHlsDownload.ts` wraps that in React state (progress/cancel via `AbortController`). The
saved file is raw concatenated MPEG-TS bytes given a `.mp4` name, not a real remux — most players
open it fine since TS is self-synchronizing, but it isn't a spec-correct MP4 container. This flow
intentionally opens in a **new tab** rather than the current tab so buffering an entire episode
into RAM doesn't compete with a simultaneously-playing video, and it is only wired up from the PC
layout (TV browsers tend to have very little RAM).

Gotcha: this TS setup can reject a plain `Uint8Array` where `BufferSource` is expected (e.g.
`crypto.subtle.decrypt`'s `iv`) with a `Uint8Array<ArrayBufferLike>` not assignable error — cast
with `as BufferSource` at the call site rather than reshaping the surrounding types.

### Data layer

`lib/api.ts` is the only KKPhim API client — typed request/response shapes for movie
lists/detail/search, plus `resolveImageUrl()` which normalizes the API's inconsistent
relative/absolute poster/thumbnail paths against the CDN base. `lib/anime.ts` separately queries
AniList by `origin_name` to enrich `type: 'hoathinh'` (anime) titles with episode counts,
scores, studios, and airing schedules — it's a best-effort join, not part of the KKPhim response.

### State

Zustand stores live in `lib/stores/`, most using the `persist` middleware to localStorage
(favorites, watch history, reminders, preferences, watch-party room, adult-content
verification). `useAuthStore` mirrors Firebase Auth (anonymous sign-in by default, with
anonymous→Google account linking via `hooks/useAuth.tsx`). `components/CloudSyncManager.tsx`
pushes/pulls watch history and prefs to Firebase for signed-in (non-anonymous) users only, merging
by `updatedAt` (last-write-wins) — anonymous users stay purely local.

### i18n

`hooks/useLanguage.tsx` provides `t(key, replacements?)` over flat key→string JSON dictionaries in
`lib/locales/{vi,en}.json`; Vietnamese is the default and the fallback when a key is missing in
the active language. Replacement syntax is a literal `{placeholder}` substring substitution — no
pluralization or nested keys. The same file also has hardcoded VI→EN maps (`GENRE_MAP`,
`COUNTRY_MAP`) for translating genre/country/status strings that come pre-localized in Vietnamese
from the KKPhim API itself.

### Watch Together

Real-time synchronized playback via Firebase Realtime Database: `hooks/useWatchParty.tsx`,
`lib/stores/useWatchPartyRoomStore.ts`, shared types/constants in `lib/watchParty/` (room codes,
heartbeat interval, drift-correction threshold). Playback is host-authoritative
(`canControlPlayback()`); members reconcile via periodic heartbeats and snap to the host's
position if drift exceeds the threshold. Note: README.md also describes an alternative standalone
WebSocket party server (`watch-party-server/`, `pnpm party-server`/`pnpm dev:all`) — that
directory and those scripts do not exist in this repo; Firebase RTDB is the only implemented
transport.

### Site-wide password gate

`proxy.ts` (Next's request-interception entry point, matches all routes except
`_next/static|_next/image|favicon.ico`) plus `lib/siteAuth.ts` implement an optional gate: unset
`PASSWORD` disables it entirely; when set, unauthenticated requests get rewritten to
`/access-denied` except `/access`, `/api/site-auth`, and known crawler user agents (regex allowlist
in `proxy.ts`, so link-preview unfurling keeps working). Auth is a signed cookie
(HMAC over a password-derived secret, not the raw password) with escalating rate-limit lockouts
on repeated bad attempts.

### Cross-cutting bits

- **Toasts**: `lib/toast.tsx` is a plain module-level pub/sub (not React Context) — call
  `toast.success()/error()/warning()/info()` from anywhere, including outside components; the
  single `<ToastManager />` in `app/layout.tsx` renders whatever's been published.
- **Adult content gate**: `lib/adult.ts` + `AdultConfirmModal`; session-scoped, checked on both
  the movie detail page and the watch page for movies flagged as adult.
- **White-labeling**: `lib/constants.ts` (`SITE_CONFIG`, `SEO_CONFIG`) is the intended single
  place to change site name/tagline/SEO defaults.
- **OG images**: `lib/og-image.tsx` + `app/api/og`, Edge-rendered ticket-style share images via
  `next/og`.
- **Images**: `next.config.ts` restricts `next/image` remote patterns to `phimimg.com`,
  `image.tmdb.org`, and `phimapi.com` — adding any other external image host requires updating
  that allowlist. Build output mode is `standalone` (for self-hosting/Docker).
- Path alias `@/*` maps to the repo root (`tsconfig.json`).
