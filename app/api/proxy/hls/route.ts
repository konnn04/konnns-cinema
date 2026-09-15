import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

function getCorsHeaders(): Record<string, string> {
  return {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, HEAD, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Range, Authorization, X-Requested-With',
    'Access-Control-Expose-Headers': 'Content-Length, Content-Range',
  };
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: getCorsHeaders(),
  });
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const targetUrl = searchParams.get('url');

  if (!targetUrl) {
    return new NextResponse('Missing url parameter', {
      status: 400,
      headers: getCorsHeaders(),
    });
  }

  try {
    const targetParsed = new URL(targetUrl);
    const origin = targetParsed.origin;

    const requestOrigin = new URL(request.url).origin;

    const forwardHeaders: Record<string, string> = {
      'User-Agent':
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'Accept': '*/*',
      'Accept-Language': 'vi,en-US;q=0.9,en;q=0.8',
      'Referer': `${origin}/`,
      'Origin': origin,
    };

    const rangeHeader = request.headers.get('range');
    if (rangeHeader) {
      forwardHeaders['Range'] = rangeHeader;
    }

    const upstreamRes = await fetch(targetUrl, {
      headers: forwardHeaders,
      cache: 'no-store',
    });

    if (!upstreamRes.ok) {
      return new NextResponse(`Upstream failed with status ${upstreamRes.status}`, {
        status: upstreamRes.status,
        headers: getCorsHeaders(),
      });
    }

    const contentType = upstreamRes.headers.get('content-type') || '';
    const isM3u8 =
      targetUrl.includes('.m3u8') ||
      contentType.includes('mpegurl') ||
      contentType.includes('application/x-mpegurl') ||
      contentType.includes('application/vnd.apple.mpegurl');

    if (isM3u8) {
      const text = await upstreamRes.text();
      const lines = text.split('\n');
      const rewrittenLines = lines.map((line) => {
        const trimmed = line.trim();
        if (!trimmed) return line;

        // Handle any HLS tag containing URI="..." (such as #EXT-X-KEY, #EXT-X-MEDIA:TYPE=AUDIO, #EXT-X-MEDIA:TYPE=SUBTITLES)
        if (trimmed.startsWith('#')) {
          if (trimmed.includes('URI="')) {
            return trimmed.replace(/URI="([^"]+)"/g, (_, uriMatch) => {
              try {
                const resolvedUri = new URL(uriMatch, targetUrl).toString();
                const proxyUri = `${requestOrigin}/api/proxy/hls?url=${encodeURIComponent(resolvedUri)}`;
                return `URI="${proxyUri}"`;
              } catch {
                return `URI="${uriMatch}"`;
              }
            });
          }
          return line;
        }

        // Segment or sub-playlist URL line
        try {
          const resolvedUri = new URL(trimmed, targetUrl).toString();
          return `${requestOrigin}/api/proxy/hls?url=${encodeURIComponent(resolvedUri)}`;
        } catch {
          return line;
        }
      });

      const modifiedPlaylist = rewrittenLines.join('\n');
      return new NextResponse(modifiedPlaylist, {
        status: 200,
        headers: {
          ...getCorsHeaders(),
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      });
    }

    const responseHeaders: Record<string, string> = {
      ...getCorsHeaders(),
      'Content-Type': contentType || 'video/mp2t',
      'Cache-Control': 'public, max-age=86400, s-maxage=86400',
    };

    const contentLength = upstreamRes.headers.get('content-length');
    if (contentLength) responseHeaders['Content-Length'] = contentLength;

    const contentRange = upstreamRes.headers.get('content-range');
    if (contentRange) responseHeaders['Content-Range'] = contentRange;

    return new Response(upstreamRes.body, {
      status: upstreamRes.status,
      headers: responseHeaders,
    });
  } catch (err: unknown) {
    console.error('HLS Proxy error:', err);
    return new NextResponse('Internal proxy error', {
      status: 500,
      headers: getCorsHeaders(),
    });
  }
}
