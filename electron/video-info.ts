export interface QuickVideoInfoSeed {
  id: string;
  title: string;
  thumbnail?: string;
  uploader: string;
  extractor: string;
}

export interface QuickHtmlMetadata {
  title?: string;
  thumbnail?: string;
  uploader?: string;
}

const decodeBasicEntities = (value: string): string => value
  .replace(/&amp;/gi, '&')
  .replace(/&quot;/gi, '"')
  .replace(/&#39;|&apos;/gi, "'")
  .replace(/&lt;/gi, '<')
  .replace(/&gt;/gi, '>')
  .replace(/&#(\d+);/g, (_match, code) => String.fromCharCode(Number(code)))
  .trim();

const readAttribute = (tag: string, name: string): string | undefined => {
  const expression = new RegExp(`${name}\\s*=\\s*(["'])([\\s\\S]*?)\\1`, 'i');
  return tag.match(expression)?.[2];
};

const resolveUrl = (value: string | undefined, pageUrl: string): string | undefined => {
  if (!value) return undefined;
  try {
    return new URL(decodeBasicEntities(value), pageUrl).toString();
  } catch {
    return undefined;
  }
};

export const parseQuickHtmlMetadata = (html: string, pageUrl: string): QuickHtmlMetadata => {
  const meta = new Map<string, string>();

  for (const match of html.matchAll(/<meta\b[^>]*>/gi)) {
    const tag = match[0];
    const key = readAttribute(tag, 'property') || readAttribute(tag, 'name');
    const content = readAttribute(tag, 'content');
    if (key && content) meta.set(key.toLowerCase(), decodeBasicEntities(content));
  }

  const documentTitle = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  const title = meta.get('og:title')
    || meta.get('twitter:title')
    || (documentTitle ? decodeBasicEntities(documentTitle) : undefined);
  const thumbnail = resolveUrl(
    meta.get('og:image') || meta.get('twitter:image') || meta.get('twitter:image:src'),
    pageUrl,
  );
  const uploader = meta.get('og:site_name') || meta.get('twitter:site');

  return { title, thumbnail, uploader };
};

const youtubeIdFromUrl = (parsed: URL): string | undefined => {
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0];
  if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return undefined;

  const queryId = parsed.searchParams.get('v');
  if (queryId) return queryId;

  const parts = parsed.pathname.split('/').filter(Boolean);
  if (['shorts', 'embed', 'live'].includes(parts[0])) return parts[1];
  return undefined;
};

const titleFromPath = (parsed: URL): string | undefined => {
  const segment = parsed.pathname.split('/').filter(Boolean).pop();
  if (!segment || /^watch$/i.test(segment)) return undefined;

  try {
    const readable = decodeURIComponent(segment).replace(/[-_]+/g, ' ').trim();
    if (!readable) return undefined;
    return readable.replace(/\b\w/g, character => character.toUpperCase());
  } catch {
    return undefined;
  }
};

export const createQuickVideoInfoSeed = (targetUrl: string): QuickVideoInfoSeed => {
  const parsed = new URL(targetUrl);
  const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
  const youtubeId = youtubeIdFromUrl(parsed);

  if (youtubeId) {
    return {
      id: youtubeId,
      title: 'YouTube video',
      thumbnail: `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg`,
      uploader: 'YouTube',
      extractor: 'YouTube',
    };
  }

  const provider = host.includes('vimeo.com') ? 'Vimeo'
    : host.includes('tiktok.com') ? 'TikTok'
      : host.includes('instagram.com') ? 'Instagram'
        : host === 'x.com' || host.endsWith('.x.com') || host.includes('twitter.com') ? 'X'
          : host;

  return {
    id: targetUrl,
    title: titleFromPath(parsed) || `${provider} media`,
    uploader: provider,
    extractor: provider,
  };
};

export const getOEmbedEndpoint = (targetUrl: string): string | undefined => {
  const host = new URL(targetUrl).hostname.toLowerCase().replace(/^www\./, '');
  const encodedUrl = encodeURIComponent(targetUrl);

  if (host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com')) {
    return `https://www.youtube.com/oembed?format=json&url=${encodedUrl}`;
  }
  if (host === 'vimeo.com' || host.endsWith('.vimeo.com')) {
    return `https://vimeo.com/api/oembed.json?url=${encodedUrl}`;
  }
  if (host === 'tiktok.com' || host.endsWith('.tiktok.com')) {
    return `https://www.tiktok.com/oembed?url=${encodedUrl}`;
  }

  return undefined;
};
