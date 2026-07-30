// Client-side HLS -> single-file downloader. Fetches every .ts segment
// referenced by an m3u8 playlist into memory (with limited concurrency),
// decrypts them if AES-128 (#EXT-X-KEY) is used, and concatenates the raw
// bytes into one Blob. This is NOT a real MP4 remux -- it's still MPEG-TS
// bytes end to end, just handed back with a video/mp4 Blob type -- but MPEG-TS
// is self-synchronizing so most players (VLC, mobile, desktop) open it fine
// regardless of the .mp4 extension used for the saved filename.

export interface HlsDownloadCallbacks {
  signal?: AbortSignal;
  concurrency?: number;
  onSegmentsResolved?: (total: number) => void;
  onProgress?: (completed: number, bytesSoFar: number) => void;
}

interface SegmentKey {
  keyBytes: ArrayBuffer;
  iv: Uint8Array;
}

interface ResolvedSegment {
  url: string;
  key: SegmentKey | null;
}

function resolveUrl(base: string, maybeRelative: string): string {
  return new URL(maybeRelative, base).toString();
}

function hexToBytes(hex: string): Uint8Array {
  const clean = hex.replace(/^0x/i, '');
  const bytes = new Uint8Array(Math.floor(clean.length / 2));
  for (let i = 0; i < bytes.length; i++) {
    bytes[i] = parseInt(clean.substr(i * 2, 2), 16);
  }
  return bytes;
}

// Per the HLS spec, when #EXT-X-KEY has no explicit IV attribute, the IV is
// the segment's media sequence number as a 16-byte big-endian integer.
function sequenceToIv(seq: number): Uint8Array {
  const iv = new Uint8Array(16);
  let n = seq;
  for (let i = 15; i >= 8; i--) {
    iv[i] = n & 0xff;
    n = Math.floor(n / 256);
  }
  return iv;
}

async function fetchText(url: string, signal?: AbortSignal): Promise<string> {
  const res = await fetch(url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch playlist (HTTP ${res.status})`);
  return res.text();
}

async function resolvePlaylist(playlistUrl: string, signal?: AbortSignal): Promise<ResolvedSegment[]> {
  const text = await fetchText(playlistUrl, signal);
  const lines = text.split('\n').map((l) => l.trim()).filter(Boolean);

  // Master playlist: pick the highest-bandwidth variant and recurse into it.
  if (lines.some((l) => l.startsWith('#EXT-X-STREAM-INF'))) {
    let bestUrl: string | null = null;
    let bestBandwidth = -1;
    for (let i = 0; i < lines.length; i++) {
      if (!lines[i].startsWith('#EXT-X-STREAM-INF')) continue;
      const match = lines[i].match(/BANDWIDTH=(\d+)/);
      const bandwidth = match ? parseInt(match[1], 10) : 0;
      const variantUri = lines[i + 1];
      if (variantUri && !variantUri.startsWith('#') && bandwidth >= bestBandwidth) {
        bestBandwidth = bandwidth;
        bestUrl = resolveUrl(playlistUrl, variantUri);
      }
    }
    if (!bestUrl) throw new Error('No playable variant found in master playlist');
    return resolvePlaylist(bestUrl, signal);
  }

  const segments: ResolvedSegment[] = [];
  const seqMatch = text.match(/#EXT-X-MEDIA-SEQUENCE:(\d+)/);
  let seq = seqMatch ? parseInt(seqMatch[1], 10) : 0;

  let currentKey: { keyBytes: ArrayBuffer; explicitIv: Uint8Array | null } | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    if (line.startsWith('#EXT-X-KEY')) {
      const methodMatch = line.match(/METHOD=([^,]+)/);
      const method = methodMatch?.[1];
      if (!method || method === 'NONE') {
        currentKey = null;
        continue;
      }
      const uriMatch = line.match(/URI="([^"]+)"/);
      if (!uriMatch) {
        currentKey = null;
        continue;
      }
      const ivMatch = line.match(/IV=(0x[0-9a-fA-F]+)/);
      const keyUrl = resolveUrl(playlistUrl, uriMatch[1]);
      const keyRes = await fetch(keyUrl, { signal });
      if (!keyRes.ok) throw new Error('Failed to fetch decryption key');
      currentKey = {
        keyBytes: await keyRes.arrayBuffer(),
        explicitIv: ivMatch ? hexToBytes(ivMatch[1]) : null,
      };
      continue;
    }

    if (line.startsWith('#EXTINF')) {
      const uri = lines[i + 1];
      if (!uri || uri.startsWith('#')) continue;
      segments.push({
        url: resolveUrl(playlistUrl, uri),
        key: currentKey ? { keyBytes: currentKey.keyBytes, iv: currentKey.explicitIv || sequenceToIv(seq) } : null,
      });
      seq++;
    }
  }

  return segments;
}

async function fetchSegment(segment: ResolvedSegment, signal?: AbortSignal): Promise<Uint8Array> {
  const res = await fetch(segment.url, { signal });
  if (!res.ok) throw new Error(`Failed to fetch segment (HTTP ${res.status})`);
  const buf = await res.arrayBuffer();
  if (!segment.key) return new Uint8Array(buf);

  const cryptoKey = await crypto.subtle.importKey('raw', segment.key.keyBytes, { name: 'AES-CBC' }, false, ['decrypt']);
  const decrypted = await crypto.subtle.decrypt({ name: 'AES-CBC', iv: segment.key.iv as BufferSource }, cryptoKey, buf);
  return new Uint8Array(decrypted);
}

// Fetches every segment with bounded concurrency; hands each one to
// `onSegmentReady` as soon as it lands (out of playlist order -- workers
// race each other), and reports completed-count/byte progress as it goes.
async function runSegmentPool(
  segments: ResolvedSegment[],
  signal: AbortSignal | undefined,
  concurrency: number,
  onSegmentReady: (index: number, data: Uint8Array) => void,
  onProgress?: (completed: number, bytesSoFar: number) => void
): Promise<void> {
  let completed = 0;
  let bytesSoFar = 0;
  let nextIndex = 0;

  async function worker() {
    while (nextIndex < segments.length) {
      if (signal?.aborted) throw new DOMException('Aborted', 'AbortError');
      const index = nextIndex++;
      const data = await fetchSegment(segments[index], signal);
      onSegmentReady(index, data);
      completed++;
      bytesSoFar += data.byteLength;
      onProgress?.(completed, bytesSoFar);
    }
  }

  await Promise.all(
    Array.from({ length: Math.min(concurrency, segments.length) }, () => worker())
  );
}

export async function downloadHlsToBlob(playlistUrl: string, callbacks: HlsDownloadCallbacks = {}): Promise<Blob> {
  const { signal, concurrency = 6, onSegmentsResolved, onProgress } = callbacks;

  const segments = await resolvePlaylist(playlistUrl, signal);
  if (segments.length === 0) throw new Error('No segments found in this stream.');
  onSegmentsResolved?.(segments.length);

  const parts: Uint8Array[] = new Array(segments.length);
  await runSegmentPool(segments, signal, concurrency, (index, data) => {
    parts[index] = data;
  }, onProgress);

  // Blob() concatenates its parts internally, so handing it the per-segment
  // chunks directly avoids allocating one extra same-size contiguous buffer
  // just to merge them ourselves -- that second allocation is what pushed
  // large movies past the browser's single-ArrayBuffer size limit.
  return new Blob(parts as BlobPart[], { type: 'video/mp4' });
}

// Streams segments straight to a File System Access API writable instead of
// building one giant in-RAM Blob, so memory use stays bounded to roughly
// `concurrency` segments at a time regardless of how long the episode is.
// Segments still land out of order under concurrency, but a video file has
// to be written sequentially -- buffer whichever arrive early and only flush
// them once every earlier index has also landed.
export async function downloadHlsToStream(
  playlistUrl: string,
  writable: FileSystemWritableFileStream,
  callbacks: HlsDownloadCallbacks = {}
): Promise<void> {
  const { signal, concurrency = 6, onSegmentsResolved, onProgress } = callbacks;

  const segments = await resolvePlaylist(playlistUrl, signal);
  if (segments.length === 0) throw new Error('No segments found in this stream.');
  onSegmentsResolved?.(segments.length);

  const pendingWrites = new Map<number, Uint8Array>();
  let nextWriteIndex = 0;
  let writeChain: Promise<void> = Promise.resolve();

  function flushReady() {
    while (pendingWrites.has(nextWriteIndex)) {
      const chunk = pendingWrites.get(nextWriteIndex)!;
      pendingWrites.delete(nextWriteIndex);
      writeChain = writeChain.then(() => writable.write(chunk as BufferSource));
      nextWriteIndex++;
    }
  }

  await runSegmentPool(segments, signal, concurrency, (index, data) => {
    pendingWrites.set(index, data);
    flushReady();
  }, onProgress);

  // Fetches are all done, but the tail of the write chain may still be
  // in flight (disk writes lag network fetches) -- wait for it to drain
  // before the caller closes the stream.
  await writeChain;
}
