'use client';

import { useState, useEffect, RefObject } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  X,
  Cast,
  Smartphone,
  Wifi,
  Copy,
  Check,
  Tv,
  ExternalLink,
  Radio,
  Volume2,
  Share2,
} from 'lucide-react';
import { useLanguage } from '@/hooks/useLanguage';
import { generateQRCodeSVG } from '@/lib/qr';

interface CastModalProps {
  isOpen: boolean;
  onClose: () => void;
  videoRef: RefObject<HTMLVideoElement | null>;
  sessionId: string;
  movieTitle?: string;
  episodeName?: string;
  mediaUrl?: string;
}

export default function CastModal({
  isOpen,
  onClose,
  videoRef,
  sessionId,
  movieTitle = "Konnn's Cinema",
  episodeName = '',
  mediaUrl = '',
}: CastModalProps) {
  const { language } = useLanguage();
  const [activeTab, setActiveTab] = useState<'remote' | 'chromecast'>('chromecast');
  const [copied, setCopied] = useState(false);
  const [castConnected, setCastConnected] = useState(false);
  const [deviceName, setDeviceName] = useState<string>('Chromecast / Smart TV');
  const [castError, setCastError] = useState<string | null>(null);

  const remoteUrl = typeof window !== 'undefined' ? `${window.location.origin}/remote/${sessionId}` : '';
  const qrSvg = remoteUrl ? generateQRCodeSVG(remoteUrl, 190) : '';

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

    if (!windowWithCast.cast) {
      windowWithCast.__onGCastApiAvailable = (isAvailable: boolean) => {
        if (isAvailable && windowWithCast.cast?.framework && windowWithCast.chrome?.cast) {
          try {
            windowWithCast.cast.framework.CastContext.getInstance().setOptions({
              receiverApplicationId: windowWithCast.chrome.cast.media?.DEFAULT_MEDIA_RECEIVER_APP_ID || 'CC1AD845',
              autoJoinPolicy: windowWithCast.chrome.cast.AutoJoinPolicy?.ORIGIN_SCOPED || 'origin_scoped',
            });
          } catch (e) {
            console.warn('Google Cast init error:', e);
          }
        }
      };

      const script = document.createElement('script');
      script.src = 'https://www.gstatic.com/cv/js/sender/v1/cast_sender.js?loadCastFramework=1';
      script.async = true;
      document.body.appendChild(script);
    }
  }, []);

  const handleTriggerChromecast = async () => {
    setCastError(null);
    const video = videoRef.current;

    // 1. Try Google Cast SDK
    const windowWithCast = window as unknown as {
      cast?: {
        framework?: {
          CastContext: {
            getInstance: () => {
              requestSession: () => Promise<{
                getCastDevice: () => { friendlyName: string };
                endSession: (stopCasting: boolean) => void;
              }>;
            };
          };
        };
      };
    };

    if (windowWithCast.cast?.framework) {
      try {
        const session = await windowWithCast.cast.framework.CastContext.getInstance().requestSession();
        if (session) {
          setCastConnected(true);
          const dev = session.getCastDevice?.();
          if (dev?.friendlyName) setDeviceName(dev.friendlyName);
          return;
        }
      } catch (err: unknown) {
        console.warn('Cast session request cancelled or failed:', err);
      }
    }

    // 2. Try HTMLMediaElement Remote Playback API
    const remoteVideo = video as unknown as { remote?: { prompt: () => Promise<void>; state: string } };
    if (remoteVideo?.remote && typeof remoteVideo.remote.prompt === 'function') {
      try {
        await remoteVideo.remote.prompt();
        setCastConnected(true);
        return;
      } catch (err: unknown) {
        console.warn('Remote Playback API prompt error:', err);
      }
    }

    // 3. Try Apple AirPlay
    const webkitVideo = video as unknown as { webkitShowPlaybackTargetPicker?: () => void };
    if (typeof webkitVideo?.webkitShowPlaybackTargetPicker === 'function') {
      try {
        webkitVideo.webkitShowPlaybackTargetPicker();
        setCastConnected(true);
        return;
      } catch (err) {
        console.warn('AirPlay picker error:', err);
      }
    }

    setCastError(
      language === 'vi'
        ? 'Không tìm thấy thiết bị Cast/AirPlay hoặc trình duyệt chưa hỗ trợ. Bạn có thể sử dụng tính năng Điều khiển bằng điện thoại ở tab bên cạnh.'
        : 'No Cast/AirPlay device found or browser unsupported. You can use the Phone Web Remote tab.'
    );
  };

  const handleCopyLink = () => {
    if (remoteUrl) {
      navigator.clipboard.writeText(remoteUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
          onClick={onClose}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 15 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 15 }}
            transition={{ duration: 0.2 }}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-lg bg-zinc-950 border border-zinc-800 shadow-2xl p-5 sm:p-6 flex flex-col gap-4 text-white max-h-[90vh] overflow-y-auto no-scrollbar"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-zinc-850 pb-3">
              <div className="flex items-center space-x-2.5">
                <div className="p-2 bg-[#E2B646]/10 border border-[#E2B646]/30 text-[#E2B646]">
                  <Cast size={18} />
                </div>
                <div>
                  <h3 className="text-base font-serif font-black tracking-wide text-white uppercase flex items-center gap-2">
                    <span>{language === 'vi' ? 'Truyền Video & Điều Khiển Từ Xa' : 'Cast & Remote Playback'}</span>
                  </h3>
                  <p className="text-[11px] text-zinc-400 font-sans mt-0.5">
                    {language === 'vi'
                      ? 'Cast lên TV, Chromecast hoặc điều khiển bằng điện thoại qua Wi-Fi'
                      : 'Stream to TV/Chromecast or control via phone on the same Wi-Fi'}
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

            {/* Navigation Tabs */}
            <div className="grid grid-cols-2 gap-2 border-b border-zinc-850 pb-3">
              <button
                onClick={() => setActiveTab('chromecast')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 text-xs font-mono border transition-all cursor-pointer ${activeTab === 'chromecast'
                  ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                  : 'border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <Tv size={14} />
                <span>Chromecast / TV</span>
              </button>

              <button
                onClick={() => setActiveTab('remote')}
                className={`flex items-center justify-center space-x-2 py-2 px-3 text-xs font-mono border transition-all cursor-pointer ${activeTab === 'remote'
                  ? 'border-[#E2B646] bg-[#E2B646]/10 text-[#E2B646] font-bold'
                  : 'border-zinc-850 bg-zinc-900/40 text-zinc-400 hover:text-zinc-200'
                  }`}
              >
                <Smartphone size={14} />
                <span>{language === 'vi' ? 'Điều khiển bằng ĐT' : 'Phone Remote'}</span>
              </button>
            </div>

            {/* Tab 1: Chromecast & AirPlay */}
            {activeTab === 'chromecast' && (
              <div className="space-y-4 py-1">
                <div className="p-4 bg-zinc-900/60 border border-zinc-850 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Radio size={16} className={castConnected ? 'text-emerald-400 animate-pulse' : 'text-[#E2B646]'} />
                      <span className="text-xs font-mono font-bold text-white">
                        {castConnected ? `Đã kết nối: ${deviceName}` : 'Sẵn sàng phát truyền (Cast)'}
                      </span>
                    </div>
                    <span className="text-[10px] font-mono px-2 py-0.5 border border-[#E2B646]/40 text-[#E2B646]">
                      Wi-Fi
                    </span>
                  </div>

                  <p className="text-xs text-zinc-400 leading-relaxed font-sans">
                    {language === 'vi'
                      ? 'Bấm nút bên dưới để mở hộp thoại tìm kiếm thiết bị Chromecast, Google TV hoặc Apple TV đang kết nối chung mạng Wi-Fi.'
                      : 'Click below to open device picker for Chromecast, Google TV or AirPlay devices on your local Wi-Fi network.'}
                  </p>

                  {castError && (
                    <div className="p-2.5 bg-red-950/40 border border-red-800/60 text-red-300 text-[11px] font-mono">
                      {castError}
                    </div>
                  )}

                  <button
                    onClick={handleTriggerChromecast}
                    className="w-full flex items-center justify-center space-x-2 py-3 bg-[#E2B646] text-black font-serif font-black text-xs uppercase tracking-wider hover:bg-white transition-all cursor-pointer shadow-lg"
                  >
                    <Cast size={15} />
                    <span>{language === 'vi' ? 'Tìm & Kết Nối Thiết Bị Cast' : 'Search & Connect Cast Device'}</span>
                  </button>
                </div>

                <div className="p-3 bg-zinc-900/30 border border-zinc-850 space-y-2">
                  <span className="text-[11px] font-mono text-zinc-300 block font-bold">
                    {language === 'vi' ? 'Mẹo sử dụng:' : 'Tips:'}
                  </span>
                  <ul className="text-[11px] text-zinc-400 font-sans space-y-1.5 list-disc list-inside">
                    <li>
                      {language === 'vi'
                        ? 'Đảm bảo TV / Chromecast và máy tính của bạn đang kết nối chung 1 mạng Wi-Fi.'
                        : 'Ensure your TV/Chromecast and computer are on the exact same Wi-Fi network.'}
                    </li>
                    <li>
                      {language === 'vi'
                        ? 'Trên trình duyệt Chrome/Edge, bạn cũng có thể bấm chuột phải vào trang web và chọn "Truyền..." (Cast).'
                        : 'On Chrome/Edge, you can also right-click anywhere and select "Cast...".'}
                    </li>
                  </ul>
                </div>
              </div>
            )}

            {/* Tab 2: Wi-Fi Phone Remote (Điều khiển bằng điện thoại) */}
            {activeTab === 'remote' && (
              <div className="space-y-4 py-1">
                <div className="flex flex-col sm:flex-row items-center gap-5 p-4 bg-zinc-900/60 border border-zinc-850">
                  {/* QR Code */}
                  <div className="bg-white p-2.5 rounded-none shadow-md shrink-0 flex items-center justify-center">
                    {qrSvg ? (
                      <div
                        dangerouslySetInnerHTML={{ __html: qrSvg }}
                        className="w-[180px] h-[180px] flex items-center justify-center"
                      />
                    ) : (
                      <div className="w-[180px] h-[180px] bg-zinc-200 animate-pulse" />
                    )}
                  </div>

                  {/* QR Instructions */}
                  <div className="space-y-2.5 text-left flex-1">
                    <div className="flex items-center space-x-1.5 text-xs font-mono text-[#E2B646] font-bold">
                      <Wifi size={14} />
                      <span>{language === 'vi' ? 'Quét mã bằng điện thoại' : 'Scan with Phone Camera'}</span>
                    </div>

                    <p className="text-xs text-zinc-300 font-sans leading-relaxed">
                      {language === 'vi'
                        ? 'Mở ứng dụng Camera trên điện thoại để quét mã QR và mở ngay bảng điều khiển từ xa (Play, Pause, Tua 10s, Âm lượng).'
                        : 'Open your phone camera to scan the QR code and instantly get mobile playback remote controls.'}
                    </p>

                    <div className="pt-1">
                      <div className="flex items-center space-x-2 bg-zinc-950 border border-zinc-800 p-2">
                        <span className="text-[10px] font-mono text-zinc-400 truncate flex-1">
                          {remoteUrl}
                        </span>
                        <button
                          onClick={handleCopyLink}
                          className="flex items-center space-x-1 px-2 py-1 bg-zinc-800 hover:bg-zinc-700 text-[10px] font-mono text-zinc-200 cursor-pointer transition-colors shrink-0"
                        >
                          {copied ? <Check size={11} className="text-emerald-400" /> : <Copy size={11} />}
                          <span>{copied ? 'Đã sao chép' : 'Copy'}</span>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-zinc-900/30 border border-zinc-850 text-xs font-sans text-zinc-400 space-y-1.5">
                  <div className="flex items-center space-x-2 text-[#E2B646] font-mono font-bold text-[11px]">
                    <Smartphone size={13} />
                    <span>{language === 'vi' ? 'Tính năng Remote trên điện thoại:' : 'Phone Remote Features:'}</span>
                  </div>
                  <p>
                    {language === 'vi'
                      ? '• Nút Play / Tạm dừng cỡ lớn • Tua lùi / tiến 10 giây • Kéo thanh thời lượng • Tăng giảm âm lượng • Chuyển tập tiếp theo • Toàn màn hình.'
                      : '• Big Play/Pause button • Jump ±10s • Progress scrubber • Volume adjustment • Next episode • Fullscreen.'}
                  </p>
                </div>
              </div>
            )}

            {/* Footer */}
            <div className="flex items-center justify-between pt-2 border-t border-zinc-850">
              <span className="text-[10px] font-mono text-zinc-500">
                Session ID: {sessionId.slice(0, 8)}
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
