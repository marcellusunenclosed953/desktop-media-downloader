import type { VideoInfo } from '../context/DownloadContext';

const youtubeIdFromUrl = (parsed: URL): string | undefined => {
    const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
    if (host === 'youtu.be') return parsed.pathname.split('/').filter(Boolean)[0];
    if (host !== 'youtube.com' && !host.endsWith('.youtube.com')) return undefined;

    const queryId = parsed.searchParams.get('v');
    if (queryId) return queryId;

    const parts = parsed.pathname.split('/').filter(Boolean);
    return ['shorts', 'embed', 'live'].includes(parts[0]) ? parts[1] : undefined;
};

const readableProvider = (host: string): string => {
    if (host.includes('youtube.com') || host === 'youtu.be') return 'YouTube';
    if (host.includes('vimeo.com')) return 'Vimeo';
    if (host.includes('tiktok.com')) return 'TikTok';
    if (host.includes('instagram.com')) return 'Instagram';
    if (host === 'x.com' || host.endsWith('.x.com') || host.includes('twitter.com')) return 'X';
    return host.replace(/^www\./, '');
};

const readablePathTitle = (parsed: URL): string | undefined => {
    const segment = parsed.pathname.split('/').filter(Boolean).pop();
    if (!segment || /^watch$/i.test(segment)) return undefined;

    try {
        const title = decodeURIComponent(segment).replace(/[-_]+/g, ' ').trim();
        return title ? title.replace(/\b\w/g, character => character.toUpperCase()) : undefined;
    } catch {
        return undefined;
    }
};

export const isCompleteMediaUrl = (value: string): boolean => {
    try {
        const parsed = new URL(value);
        return (parsed.protocol === 'http:' || parsed.protocol === 'https:') && Boolean(parsed.hostname);
    } catch {
        return false;
    }
};

export const createImmediateVideoPreview = (targetUrl: string): VideoInfo => {
    const parsed = new URL(targetUrl);
    const provider = readableProvider(parsed.hostname.toLowerCase());
    const youtubeId = youtubeIdFromUrl(parsed);

    return {
        id: youtubeId || targetUrl,
        title: youtubeId ? 'YouTube video' : readablePathTitle(parsed) || `${provider} media`,
        thumbnail: youtubeId ? `https://i.ytimg.com/vi/${encodeURIComponent(youtubeId)}/hqdefault.jpg` : '',
        duration: 0,
        uploader: provider,
        webpage_url: targetUrl,
        extractor: provider,
        videoQualities: [],
        videoQualitySizes: {},
        hasAudio: true,
        isPartial: true,
    };
};
