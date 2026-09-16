'use client';
/* eslint-disable @next/next/no-img-element */

import { useState, useEffect, RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Cast,
  Smartphone,
  Copy,
  Check,
  Tv,
  ExternalLink,
  Radio,
  Share2,
  AlertTriangle,
  Globe,
  Sparkles,
  Link as LinkIcon,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { generateQRCodeDataURL, getQRCodeApiUrl } from '@/lib/qr';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  sessionId: string;
  movieTitle?: string;
  episodeName?: string;
  mediaUrl?: string;
  /** Called right before we hand the <video> element's src to Remote Playback, so
   * the caller can detach hls.js (it otherwise fights over video.src via MediaSource). */
  onPrepareForRemoteCast?: () => void;
  /** Called once the Remote Playback session ends, so the caller can reinitialize
   * hls.js and resume local playback. */
  onRemoteCastEnded?: () => void;
}

type CastTab = 'remote' | 'browser' | 'stream' | 'chromecast';

export default function CastModal({
  isOpen,
  onClose,
  videoRef,
  sessionId,
  movieTitle = "Konnn's Cinema",
  episodeName = '',
  mediaUrl = '',
  onPrepareForRemoteCast,
  onRemoteCastEnded,
}: CastModalProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<CastTab>('remote');
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [copiedStream, setCopiedStream] = useState(false);
  const [copiedProxy, setCopiedProxy] = useState(false);
  const [copiedRemote, setCopiedRemote] = useState(false);
  const [castConnected, setCastConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('Chromecast / Smart TV');
  const [castError, setCastError] = useState<string | null>(null);
  const [isCastingLoading, setIsCastingLoading] = useState(false);
  const [castSdkReady, setCastSdkReady] = useState(() => {
    if (typeof window === 'undefined') return false;
    return !!(window as unknown as { cast?: { framework?: unknown } }).cast?.framework;
  });

  const [remoteQrUrl, setRemoteQrUrl] = useState<string>('');
  const [tvQrUrl, setTvQrUrl] = useState<string>('');

  const currentWatchUrl = typeof window !== 'undefined' ? window.location.href : '';
  const remoteUrl = typeof window !== 'undefined' ? `${window.location.origin}/remote/${sessionId}` : '';
  const proxyStreamUrl = typeof window !== 'undefined' && mediaUrl ? `${window.location.origin}/api/proxy/hls?url=${encodeURIComponent(mediaUrl)}` : '';

  useEffect(() => {
    if (remoteUrl) {
      generateQRCodeDataURL(remoteUrl, 200).then((url) => {
        setRemoteQrUrl(url || getQRCodeApiUrl(remoteUrl, 200));
      });
    }
  }, [remoteUrl]);

  useEffect(() => {
    if (currentWatchUrl) {
      generateQRCodeDataURL(currentWatchUrl, 200).then((url) => {
        setTvQrUrl(url || getQRCodeApiUrl(currentWatchUrl, 200));
      });
    }
  }, [currentWatchUrl]);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const windowWithCast = window as unknown as {
      __onGCastApiAvailable?: (isAvailable: boolean) => void;
      cast?: {
        framework?: {
          CastContext: {
            getInstance: () => {
              setOptions: (opts: { receiverApplicationId: string; autoJoinPolicy: string }) => void;
              requestSession: () => Promise<unknown>;
              getCastState: () => string;
            };
          };
        };
      };
      chrome?: {
        cast?: {
          media?: {
            DEFAULT_MEDIA_RECEIVER_APP_ID: string;
          };
          AutoJoinPolicy?: {
            ORIGIN_SCOPED: string;
          };
        };
      };
    };

    // Already loaded (e.g. modal remounted) — reflected by castSdkReady's lazy
    // initializer above, nothing more to do.
    if (windowWithCast.cast?.framework) return;

    windowWithCast.__onGCastApiAvailable = (isAvailable: boolean) => {
      if (isAvailable && windowWithCast.cast?.framework && windowWithCast.chrome?.cast) {
        try {
          windowWithCast.cast.framework.CastContext.getInstance().setOptions({
            receiverApplicationId: windowWithCast.chrome.cast.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
            autoJoinPolicy: windowWithCast.chrome.cast.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped',
          });
          setCastSdkReady(true);
        } catch (e) {
          console.warn('Google Cast init error:', e);
        }
      }
    };

    const script = document.createElement('script');
    script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
    script.async = true;
    document.body.appendChild(script);
  }, []);

  // Wait for the Cast Sender SDK to finish loading (mobile networks can be slow),
  // instead of falling through immediately to the browser's native Remote Playback
  // prompt, which cannot actually stream our hls.js/MediaSource (blob:) video to a
  // receiver — it just connects and shows an idle screen while playback stays local.
  const waitForCastSdk = (timeoutMs = 4000): Promise<boolean> => {
    if (castSdkReady) return Promise.resolve(true);
    return new Promise((resolve) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        const w = window as unknown as { cast?: { framework?: unknown } };
        if (w.cast?.framework) {
          clearInterval(interval);
          resolve(true);
        } else if (Date.now() - startedAt >= timeoutMs) {
          clearInterval(interval);
          resolve(false);
        }
      }, 200);
    });
  };

  const handleTriggerChromecast = async () => {
    setCastError(null);
    setIsCastingLoading(true);
    const video = videoRef.current;

    if (!(window as unknown as { cast?: { framework?: unknown } }).cast?.framework) {
      await waitForCastSdk();
    }

    const windowWithCast = window as unknown as {
      cast?: {
        framework?: {
          CastContext: {
            getInstance: () => {
              requestSession: () => Promise<{
                getCastDevice: () => { friendlyName: string };
                loadMedia: (request: unknown) => Promise<unknown>;
              }>;
              getCurrentSession: () => {
                getCastDevice?: () => { friendlyName: string };
                loadMedia?: (request: unknown) => Promise<unknown>;
              } | null;
            };
          };
        };
      };
      chrome?: {
        cast?: {
          media?: {
            MediaInfo: new (url: string, contentType: string) => {
              streamType: unknown;
              metadata: unknown;
            };
            GenericMediaMetadata: new () => {
              title: string;
              subtitle: string;
            };
            LoadRequest: new (mediaInfo: unknown) => {
              autoplay: boolean;
              currentTime: number;
            };
            StreamType?: {
              BUFFERED: unknown;
            };
          };
        };
      };
    };

    // 1. Try Google Cast SDK with full LoadMedia via CORS-enabled Proxy
    if (windowWithCast.cast?.framework) {
      try {
        const session = await windowWithCast.cast.framework.CastContext.getInstance().requestSession();
        if (session) {
          const dev = session.getCastDevice?.();
          if (dev?.friendlyName) setDeviceName(dev.friendlyName);

          if (mediaUrl && windowWithCast.chrome?.cast?.media) {
            try {
              // Pass HLS stream through our CORS & Referer proxy so Chromecast hardware never gets blocked
              const castStreamUrl = mediaUrl.startsWith('http')
                ? `${window.location.origin}/api/proxy/hls?url=${encodeURIComponent(mediaUrl)}`
                : mediaUrl;

              const mediaInfo = new windowWithCast.chrome.cast.media.MediaInfo(castStreamUrl, 'application/x-mpegurl');
              if (windowWithCast.chrome.cast.media.StreamType) {
                mediaInfo.streamType = windowWithCast.chrome.cast.media.StreamType.BUFFERED;
              }
              const metadata = new windowWithCast.chrome.cast.media.GenericMediaMetadata();
              metadata.title = movieTitle || "Konnn's Cinema";
              metadata.subtitle = episodeName || '';
              mediaInfo.metadata = metadata;

              const loadRequest = new windowWithCast.chrome.cast.media.LoadRequest(mediaInfo);
              loadRequest.autoplay = true;
              loadRequest.currentTime = video?.currentTime || 0;

              await session.loadMedia(loadRequest);
              video?.pause();
              setCastConnected(true);
              setIsCastingLoading(false);
              return;
            } catch (mediaErr) {
              console.warn('Cast loadMedia failed:', mediaErr);
              setCastError(
                language === 'vi'
                  ? 'TV đã kết nối nhưng thiết bị Cast chưa mở được luồng phát. Bạn hãy dùng tab "Trình duyệt TV" hoặc copy link Proxy sang app CastTV để phát ngay!'
                  : 'TV connected but Cast device failed to load stream. Please use the "TV Browser" tab or paste proxy link to CastTV app!'
              );
              setIsCastingLoading(false);
              return;
            }
          }

          setCastConnected(true);
          setIsCastingLoading(false);
          return;
        }
      } catch (err: unknown) {
        console.warn('Cast session request cancelled or failed:', err);
      }
    }

    // 2. Fall back to the HTMLMediaElement Remote Playback API. This is the ONLY
    // Cast path available on mobile browsers: the Google Cast Sender SDK above
    // (`window.cast.framework`) only ever becomes available on desktop Chrome, so
    // step 1 always falls through here on Android.
    //
    // Our <video> is normally driven by hls.js via MediaSource Extensions, so
    // `video.currentSrc` is a local `blob:` URL — a Chromecast receiver can never
    // fetch that. Calling `remote.prompt()` on it still "succeeds" (the session
    // connects) but the receiver has nothing it can load, so the TV just sits on
    // its idle Cast logo while playback silently continues on the phone. That is
    // the exact bug this fallback used to cause.
    //
    // Fix: detach hls.js first and point the element straight at the real,
    // CORS-proxied .m3u8 URL so the receiver can fetch it directly, then restore
    // local hls.js playback once the cast session ends.
    if (video && mediaUrl && video.remote && typeof video.remote.prompt === 'function') {
      const resumeTime = video.currentTime;
      const castStreamUrl = mediaUrl.startsWith('http')
        ? `${window.location.origin}/api/proxy/hls?url=${encodeURIComponent(mediaUrl)}`
        : mediaUrl;

      let restored = false;
      const restoreLocalPlayback = () => {
        if (restored) return;
        restored = true;
        video.remote?.removeEventListener('disconnect', restoreLocalPlayback);
        video.src = '';
        onRemoteCastEnded?.();
      };

      try {
        onPrepareForRemoteCast?.();
        video.src = castStreamUrl;
        video.currentTime = resumeTime;
        video.remote.addEventListener('disconnect', restoreLocalPlayback);

        await video.remote.prompt();
        setCastConnected(true);
        setIsCastingLoading(false);
        return;
      } catch (err: unknown) {
        console.warn('Remote Playback API prompt error:', err);
        restoreLocalPlayback();
      }
    }

    // 3. Try Apple AirPlay
    const webkitVideo = video as unknown as { webkitShowPlaybackTargetPicker?: () => void };
    if (typeof webkitVideo?.webkitShowPlaybackTargetPicker === 'function') {
      try {
        webkitVideo.webkitShowPlaybackTargetPicker();
        setCastConnected(true);
        setIsCastingLoading(false);
        return;
      } catch (err) {
        console.warn('AirPlay picker error:', err);
      }
    }

    setIsCastingLoading(false);
    setCastError(
      language === 'vi'
        ? 'Chưa tải xong SDK Google Cast hoặc không tìm thấy thiết bị AirPlay. Bạn hãy thử lại sau vài giây, hoặc chuyển sang tab "Trình duyệt TV" (Đề xuất tốt nhất — luôn hoạt động).'
        : 'The Google Cast SDK isn\'t ready yet, or no AirPlay device was found. Try again in a few seconds, or switch to the "TV Browser" tab (recommended — always works).'
    );
  };

  const handleCopy = (text: string, type: 'remote' | 'tv' | 'stream' | 'proxy') => {
    if (!text) return;
    navigator.clipboard.writeText(text);
    if (type === 'remote') {
      setCopiedRemote(true);
      setTimeout(() => setCopiedRemote(false), 2000);
    } else if (type === 'tv') {
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } else if (type === 'proxy') {
      setCopiedProxy(true);
      setTimeout(() => setCopiedProxy(false), 2000);
    } else {
      setCopiedStream(true);
      setTimeout(() => setCopiedStream(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md bg-zinc-950 border border-zinc-800 shadow-2xl p-4 sm:p-5 flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto no-scrollbar rounded-none"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#E2B646]/10 border border-[#E2B646]/30 text-[#E2B646]">
                  <Cast size={18} />
                </div>
                <div>
                  <h3 className="text-sm font-serif font-black tracking-wide text-white uppercase flex items-center gap-1.5">
                    <span>{language === 'vi' ? 'Truyền Video & Điều Khiển Từ Xa' : 'Cast & Remote Playback'}</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                    {language === 'vi'
                      ? 'Cast lên TV hoặc điều khiển bằng điện thoại qua Wi-Fi'
                      : 'Cast to TV or control via phone on local Wi-Fi'}
                  </p>
                </div>
              </div>

              <button
                onClick={onClose}
                className="p-1.5 text-zinc-400 hover:text-white border border-transparent hover:border-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Navigation Tabs (Clear 4 grid tabs) */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 border-b border-zinc-850 pb-3">
              <button
                onClick={() => setActiveTab('remote')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2 text-xs font-mono border transition-all cursor-pointer ${
                  activeTab === 'remote'
                    ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                    : 'border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Smartphone size={13} />
                <span>{language === 'vi' ? 'Remote ĐT' : 'Remote'}</span>
              </button>

              <button
                onClick={() => setActiveTab('browser')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2 text-xs font-mono border transition-all cursor-pointer ${
                  activeTab === 'browser'
                    ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                    : 'border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Globe size={13} />
                <span>{language === 'vi' ? 'Mở trên TV' : 'Smart TV'}</span>
              </button>

              <button
                onClick={() => setActiveTab('stream')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2 text-xs font-mono border transition-all cursor-pointer ${
                  activeTab === 'stream'
                    ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                    : 'border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Share2 size={13} />
                <span>{language === 'vi' ? 'App CastTV' : 'CastTV'}</span>
              </button>

              <button
                onClick={() => setActiveTab('chromecast')}
                className={`flex items-center justify-center space-x-1.5 py-2 px-2 text-xs font-mono border transition-all cursor-pointer ${
                  activeTab === 'chromecast'
                    ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                    : 'border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                }`}
              >
                <Cast size={13} />
                <span>Chromecast</span>
              </button>
            </div>

            {/* TAB 1: Mobile Web Remote (Spacious, centered layout without crowding) */}
            {activeTab === 'remote' && (
              <div className="flex flex-col items-center text-center space-y-3.5 py-1">
                {/* Centered QR Frame */}
                <div className="bg-white p-3 rounded-none shadow-xl border-2 border-[#E2B646]/30 inline-flex items-center justify-center">
                  {remoteQrUrl ? (
                    <img
                      src={remoteQrUrl}
                      alt="Remote QR Code"
                      width={160}
                      height={160}
                      className="w-[155px] h-[155px] object-contain"
                    />
                  ) : (
                    <div className="w-[155px] h-[155px] bg-zinc-200 animate-pulse" />
                  )}
                </div>

                <div className="space-y-1">
                  <span className="text-xs font-mono font-bold text-[#E2B646] flex items-center justify-center gap-1.5">
                    <Smartphone size={14} />
                    <span>{language === 'vi' ? 'Quét mã bằng Camera điện thoại' : 'Scan with Phone Camera'}</span>
                  </span>
                  <p className="text-xs text-zinc-300 font-sans max-w-xs leading-relaxed">
                    {language === 'vi'
                      ? 'Mở ứng dụng Camera trên điện thoại để quét mã QR và mở ngay bảng điều khiển từ xa (Play, Pause, Tua 10s, Âm lượng).'
                      : 'Scan this QR code with your phone camera to open mobile playback remote controls.'}
                  </p>
                </div>

                {/* Full-width clean URL box with copy & open buttons (Never overflows!) */}
                <div className="w-full space-y-2 pt-1">
                  <div className="w-full flex items-center bg-zinc-900/80 border border-zinc-800 p-1.5 space-x-2">
                    <LinkIcon size={14} className="text-zinc-500 shrink-0 ml-1" />
                    <input
                      type="text"
                      readOnly
                      value={remoteUrl}
                      className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 outline-none truncate select-all"
                    />
                    <button
                      onClick={() => handleCopy(remoteUrl, 'remote')}
                      className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#E2B646] text-black hover:bg-white text-[11px] font-mono font-bold cursor-pointer transition-colors shrink-0"
                    >
                      {copiedRemote ? <Check size={12} className="text-black" /> : <Copy size={12} />}
                      <span>{copiedRemote ? 'Đã sao chép' : 'Sao chép'}</span>
                    </button>
                  </div>

                  <a
                    href={remoteUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="w-full flex items-center justify-center space-x-1.5 py-2 bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
                  >
                    <ExternalLink size={13} />
                    <span>{language === 'vi' ? 'Mở Remote trên tab mới' : 'Open Remote in new tab'}</span>
                  </a>
                </div>
              </div>
            )}

            {/* TAB 2: Smart TV Web Browser (Recommended) */}
            {activeTab === 'browser' && (
              <div className="flex flex-col items-center text-center space-y-3.5 py-1">
                <div className="w-full flex items-center space-x-2 bg-emerald-950/40 border border-emerald-800/60 p-2.5 text-emerald-300 text-xs font-mono text-left">
                  <Sparkles size={16} className="shrink-0 text-emerald-400" />
                  <span>
                    {language === 'vi'
                      ? 'Đề xuất số 1: Mở trực tiếp trên Trình duyệt Smart TV chạy mượt 100%, không lo lỗi CORS/Chromecast!'
                      : 'Recommended: Open directly in Smart TV Browser, 100% reliable!'}
                  </span>
                </div>

                {/* Centered QR Frame */}
                <div className="bg-white p-3 rounded-none shadow-xl border-2 border-emerald-500/30 inline-flex items-center justify-center">
                  {tvQrUrl ? (
                    <img
                      src={tvQrUrl}
                      alt="Smart TV Movie QR"
                      width={160}
                      height={160}
                      className="w-[155px] h-[155px] object-contain"
                    />
                  ) : (
                    <div className="w-[155px] h-[155px] bg-zinc-200 animate-pulse" />
                  )}
                </div>

                <div className="w-full space-y-2 text-left bg-zinc-900/40 border border-zinc-850 p-3">
                  <span className="text-xs font-mono text-[#E2B646] font-bold block">
                    {language === 'vi' ? 'Các bước xem trên Smart TV:' : 'Steps for Smart TV:'}
                  </span>
                  <ol className="text-xs text-zinc-300 font-sans space-y-1.5 list-decimal list-inside leading-relaxed">
                    <li>
                      {language === 'vi'
                        ? 'Bật ứng dụng Internet / Web Browser có sẵn trên TV (Samsung, LG, Sony, Android TV).'
                        : 'Open built-in Web Browser on TV (Samsung, LG, Sony, Android TV).'}
                    </li>
                    <li>
                      {language === 'vi'
                        ? 'Quét mã QR hoặc nhập liên kết trang phim bên dưới vào TV.'
                        : 'Scan QR code or enter the link below into TV browser.'}
                    </li>
                    <li>
                      {language === 'vi'
                        ? 'Video phát Full HD 1080p. Quét mã Remote để dùng điện thoại điều khiển TV!'
                        : 'Plays full 1080p natively. Use phone as remote control!'}
                    </li>
                  </ol>
                </div>

                {/* URL box */}
                <div className="w-full flex items-center bg-zinc-900/80 border border-zinc-800 p-1.5 space-x-2">
                  <Globe size={14} className="text-zinc-500 shrink-0 ml-1" />
                  <input
                    type="text"
                    readOnly
                    value={currentWatchUrl}
                    className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 outline-none truncate select-all"
                  />
                  <button
                    onClick={() => handleCopy(currentWatchUrl, 'tv')}
                    className="flex items-center space-x-1 px-2.5 py-1.5 bg-[#E2B646] text-black hover:bg-white text-[11px] font-mono font-bold cursor-pointer transition-colors shrink-0"
                  >
                    {copiedUrl ? <Check size={12} className="text-black" /> : <Copy size={12} />}
                    <span>{copiedUrl ? 'Đã sao chép' : 'Sao chép link'}</span>
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: App CastTV / Web Video Caster / VLC Stream link */}
            {activeTab === 'stream' && (
              <div className="space-y-3.5 py-1 text-left">
                <div className="p-3.5 bg-zinc-900/60 border border-zinc-850 space-y-3">
                  <div className="flex items-center space-x-2 text-xs font-mono text-[#E2B646] font-bold">
                    <Share2 size={15} />
                    <span>{language === 'vi' ? 'Dành cho App CastTV & Web Video Caster' : 'For CastTV & Caster Apps'}</span>
                  </div>

                  <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                    {language === 'vi'
                      ? 'Nếu TV của bạn đang mở ứng dụng "CastTV", "Web Video Caster" hoặc "VLC", hãy sao chép link stream (.m3u8) bên dưới và dán vào app trên điện thoại để truyền trực tiếp lên TV.'
                      : 'If your TV runs "CastTV", "Web Video Caster", or "VLC", copy the direct .m3u8 link below and paste it into the app.'}
                  </p>

                  {/* Direct Stream URL */}
                  <div className="space-y-1">
                    <span className="text-[10px] font-mono text-zinc-400">1. Link Stream Gốc (.m3u8):</span>
                    <div className="w-full flex items-center bg-zinc-950 border border-zinc-800 p-1.5 space-x-2">
                      <LinkIcon size={14} className="text-zinc-500 shrink-0 ml-1" />
                      <input
                        type="text"
                        readOnly
                        value={mediaUrl || 'Đang lấy link stream...'}
                        className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 outline-none truncate select-all"
                      />
                      <button
                        onClick={() => handleCopy(mediaUrl, 'stream')}
                        className="flex items-center space-x-1 px-3 py-1.5 bg-[#E2B646] text-black hover:bg-white text-xs font-mono font-bold cursor-pointer transition-colors shrink-0"
                      >
                        {copiedStream ? <Check size={12} className="text-black" /> : <Copy size={12} />}
                        <span>{copiedStream ? 'Đã sao chép' : 'Chép link gốc'}</span>
                      </button>
                    </div>
                  </div>

                  {/* CORS-enabled Proxy Stream URL */}
                  {proxyStreamUrl && (
                    <div className="space-y-1 pt-1">
                      <span className="text-[10px] font-mono text-[#E2B646]">2. Link Proxy Vượt Tường Lửa CORS (Khuyên dùng):</span>
                      <div className="w-full flex items-center bg-zinc-950 border border-[#E2B646]/30 p-1.5 space-x-2">
                        <Globe size={14} className="text-[#E2B646] shrink-0 ml-1" />
                        <input
                          type="text"
                          readOnly
                          value={proxyStreamUrl}
                          className="flex-1 bg-transparent text-[11px] font-mono text-zinc-300 outline-none truncate select-all"
                        />
                        <button
                          onClick={() => handleCopy(proxyStreamUrl, 'proxy')}
                          className="flex items-center space-x-1 px-3 py-1.5 bg-zinc-800 hover:bg-[#E2B646] text-white hover:text-black text-xs font-mono font-bold cursor-pointer transition-colors shrink-0 border border-zinc-700"
                        >
                          {copiedProxy ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
                          <span>{copiedProxy ? 'Đã sao chép' : 'Chép link Proxy'}</span>
                        </button>
                      </div>
                    </div>
                  )}

                  {mediaUrl && (
                    <a
                      href={`wvc-x-callback://open?url=${encodeURIComponent(proxyStreamUrl || mediaUrl)}`}
                      className="w-full flex items-center justify-center space-x-1.5 py-2.5 bg-zinc-850 border border-zinc-750 hover:border-[#E2B646] text-xs font-mono text-zinc-200 transition-colors cursor-pointer"
                    >
                      <ExternalLink size={13} />
                      <span>Mở qua Web Video Caster (Tự động mở app)</span>
                    </a>
                  )}
                </div>

                <div className="p-3 bg-zinc-900/30 border border-zinc-850 text-xs font-sans text-zinc-400 space-y-1">
                  <p>
                    {language === 'vi'
                      ? '💡 Mẹo: Link Proxy CORS đã được cấu hình sẵn Referer giả lập và Header CORS (*), cho phép dán vào Web Video Caster, CastTV hoặc VLC trên Smart TV để xem không lo chặn bản quyền hay gián đoạn.'
                      : '💡 Tip: CORS Proxy stream includes rewritten headers and bypasses ISP/CDN blocking for external players.'}
                  </p>
                </div>
              </div>
            )}

            {/* TAB 4: Google Cast SDK & AirPlay */}
            {activeTab === 'chromecast' && (
              <div className="space-y-3.5 py-1 text-left">
                <div className="p-4 bg-zinc-900/60 border border-zinc-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Radio size={15} className={castConnected ? 'text-emerald-400 animate-pulse' : 'text-[#E2B646]'} />
                      <span className="text-xs font-mono font-bold text-white">
                        {castConnected ? `Đã kết nối: ${deviceName}` : 'Sẵn sàng truyền (Google Cast / AirPlay)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 border border-[#E2B646]/40 text-[#E2B646]">
                      Wi-Fi
                    </span>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed font-sans">
                    {language === 'vi'
                      ? 'Bấm nút bên dưới để chọn thiết bị Chromecast, Google TV hoặc Apple TV. Khi kết nối, video sẽ tự động chuyển sang TV và tạm dừng trên điện thoại/máy tính.'
                      : 'Click below to pick Chromecast, Google TV, or AirPlay device. Playback transfers to TV and pauses locally.'}
                  </p>

                  {castError && (
                    <div className="p-3 bg-red-950/40 border border-red-800/60 text-red-300 text-xs font-mono leading-relaxed space-y-1">
                      <div className="flex items-center space-x-1.5 font-bold text-red-200">
                        <AlertTriangle size={14} />
                        <span>Lưu ý về nguồn phát:</span>
                      </div>
                      <p>{castError}</p>
                    </div>
                  )}

                  <button
                    onClick={handleTriggerChromecast}
                    disabled={isCastingLoading}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-[#E2B646] text-black font-serif font-black text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer shadow-lg disabled:opacity-50"
                  >
                    <Cast size={16} />
                    <span>
                      {isCastingLoading
                        ? 'Đang kết nối TV...'
                        : language === 'vi'
                        ? 'Tìm & Kết Nối Thiết Bị Cast'
                        : 'Search & Connect Cast Device'}
                    </span>
                  </button>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
              <span className="text-[10px] font-mono text-zinc-500">
                Session: {sessionId.slice(0, 8)} • Konnn&apos;s Cinema Cast
              </span>
              <button
                onClick={onClose}
                className="px-4 py-1.5 border border-zinc-700 bg-zinc-900 text-xs font-mono text-zinc-300 hover:text-white transition-colors cursor-pointer"
              >
                {language === 'vi' ? 'Đóng' : 'Close'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
