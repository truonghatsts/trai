// Content script (declared in manifest.json). Runs on http(s) pages; answers a
// DETECT_VIDEO message from the background on action click with the EXACT
// source URL (research #6: never normalize) and duration when known.

export interface VideoInfo {
  sourceUrl: string;
  durationSeconds: number | null;
}

const KNOWN_VIDEO_HOSTS = ['youtube.com', 'youtu.be', 'vimeo.com', 'dailymotion.com'];

function hostMatches(host: string, suffix: string): boolean {
  return host === suffix || host.endsWith('.' + suffix);
}

export function parseIso8601Duration(value: string): number | null {
  const m = /^PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+(?:\.\d+)?)S)?$/.exec(value);
  if (!m) return null;
  const h = Number(m[1] ?? 0);
  const min = Number(m[2] ?? 0);
  const s = Number(m[3] ?? 0);
  return Math.round(h * 3600 + min * 60 + s);
}

export function detectVideoPage(url: URL, doc: Document): VideoInfo | null {
  const host = url.hostname.toLowerCase();

  if (hostMatches(host, 'youtube.com') || host === 'youtu.be') {
    const isWatch =
      host === 'youtu.be' || (url.pathname.startsWith('/watch') && url.searchParams.has('v'));
    if (!isWatch) return null;
    let durationSeconds: number | null = null;
    const meta = doc.querySelector('meta[itemprop="duration"]')?.getAttribute('content');
    if (meta) durationSeconds = parseIso8601Duration(meta);
    return { sourceUrl: url.href, durationSeconds };
  }

  if (KNOWN_VIDEO_HOSTS.some((h) => hostMatches(host, h))) {
    return { sourceUrl: url.href, durationSeconds: null }; // worker probes duration
  }

  // Generic fallback: the page embeds a <video> element.
  const video = doc.querySelector('video');
  if (video && Number.isFinite(video.duration) && video.duration > 0) {
    return { sourceUrl: url.href, durationSeconds: Math.round(video.duration) };
  }
  return null;
}

if (typeof chrome !== 'undefined') {
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    if (msg?.type === 'DETECT_VIDEO') {
      sendResponse(detectVideoPage(new URL(location.href), document));
    }
  });
}
