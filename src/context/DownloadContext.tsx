import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { removeAllTerminalDownloads, removeRelatedTerminalDownloads } from './downloadState';

export interface DownloadItem {
    id: string;
    url: string;
    title: string;
    thumbnail?: string;
    progress: number;
    status: 'pending' | 'downloading' | 'completed' | 'error' | 'paused';
    speed?: string;
    eta?: string;
    format?: 'video' | 'audio' | 'photo';
    quality?: string;
    outputDir?: string;
    enableTurboDownload?: boolean;
    adaptiveTurboDownload?: boolean;
    turboConnections?: number;
    photoTimestampMode?: 'screenshot' | 'thumbnail';
    error?: string;
    completedAt?: string;
}

export interface PerDownloadTurboOptions {
    enabled: boolean;
    adaptive?: boolean;
    connections?: number;
}

export interface AddDownloadOptions {
    outputDir?: string;
    turboOverride?: PerDownloadTurboOptions;
    photoTimestampMode?: 'screenshot' | 'thumbnail';
}

export interface HistoryItem {
    id: string;
    title: string;
    url: string;
    thumbnail?: string;
    format: 'video' | 'audio' | 'photo';
    quality?: string;
    completedAt: string;
}

export interface VideoInfo {
    id: string;
    title: string;
    thumbnail: string;
    duration: number;
    uploader: string;
    view_count?: number;
    upload_date?: string;
    description?: string;
    webpage_url?: string;
    extractor?: string;
    videoQualities?: number[];
    videoQualitySizes?: Record<string, number>;
    hasAudio?: boolean;
    extractedUrl?: string;
    extractedSources?: Record<string, string>;
    isPartial?: boolean;
}

export interface DownloadSettings {
    historyEnabled: boolean;
    defaultQuality: string;
    // Enhanced settings
    embedSubtitles: boolean;
    subtitleLanguages: string[];
    embedMetadata: boolean;
    preserveThumbnail: boolean;
    embedAltAudio: boolean;
    preferredAudioLang: string;
    cookiesFromBrowser: string;
    enableTurboDownload: boolean;
    adaptiveTurboDownload: boolean;
    turboConnections: number;
    // File naming
    fileNameTemplate: string;
    // Notifications
    enableNotifications: boolean;
}

interface DownloadContextType {
    downloads: DownloadItem[];
    history: HistoryItem[];
    settings: DownloadSettings;
    addDownload: (url: string, format?: 'video' | 'audio' | 'photo', quality?: string, outputDirOrOptions?: string | AddDownloadOptions) => Promise<void>;
    removeDownload: (id: string) => void;
    cancelDownload: (id: string) => Promise<void>;
    pauseDownload: (id: string) => Promise<void>;
    resumeDownload: (id: string) => Promise<void>;
    cancelAllDownloads: () => Promise<void>;
    stopAllDownloads: () => Promise<void>;
    resumeAllDownloads: () => Promise<void>;
    boostDownload: (id: string) => Promise<void>;
    retryDownload: (id: string) => Promise<void>;
    clearCompleted: () => void;
    clearHistory: () => void;
    removeFromHistory: (id: string) => void;
    updateSettings: (settings: Partial<DownloadSettings>) => void;
    getVideoInfo: (url: string) => Promise<{ success: boolean; data?: VideoInfo; error?: string }>;
    getFastVideoInfo: (url: string) => Promise<{ success: boolean; data?: VideoInfo; error?: string }>;
    // New methods
    searchVideos: (query: string, platform: string, count?: number) => Promise<any>;
    getPlaylistInfo: (url: string) => Promise<any>;
    getAvailableBrowsers: () => Promise<any>;
    validateBrowserCookies: (browser: string) => Promise<any>;
}

// Window types are defined in vite-env.d.ts

const HISTORY_STORAGE_KEY = 'desktop-media-download-history';
const DOWNLOADS_STORAGE_KEY = 'desktop-media-downloads';
const SETTINGS_STORAGE_KEY = 'desktop-media-settings';
const SAVE_DEBOUNCE_MS = 1000;
const CACHE_TTL_MS = 5 * 60 * 1000;
const QUICK_CACHE_TTL_MS = 30 * 60 * 1000;

const defaultSettings: DownloadSettings = {
    historyEnabled: true,
    defaultQuality: '1080',
    // Enhanced defaults
    embedSubtitles: false,
    subtitleLanguages: ['en', 'tr'],
    embedMetadata: false,
    preserveThumbnail: false,
    embedAltAudio: false,
    preferredAudioLang: 'original',
    cookiesFromBrowser: '',
    enableTurboDownload: false,
    adaptiveTurboDownload: false,
    turboConnections: 8,
    // File naming
    fileNameTemplate: '{title}',
    // Notifications
    enableNotifications: true,
};

const DownloadContext = createContext<DownloadContextType | undefined>(undefined);

const getMetadataCacheKey = (rawUrl: string): string => {
    try {
        const parsed = new URL(rawUrl);
        const host = parsed.hostname.toLowerCase().replace(/^www\./, '');
        const isYouTube = host === 'youtu.be' || host === 'youtube.com' || host.endsWith('.youtube.com');

        if (isYouTube) {
            const pathParts = parsed.pathname.split('/').filter(Boolean);
            const id = host === 'youtu.be'
                ? pathParts[0]
                : parsed.searchParams.get('v') || (['shorts', 'embed', 'live'].includes(pathParts[0]) ? pathParts[1] : undefined);
            if (id) return `youtube:${id}`;
        }

        parsed.searchParams.delete('t');
        parsed.searchParams.delete('start');
        parsed.searchParams.delete('time_continue');
        parsed.hash = '';
        return parsed.toString();
    } catch {
        return rawUrl.trim();
    }
};

export const DownloadProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const [downloads, setDownloads] = useState<DownloadItem[]>([]);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [settings, setSettings] = useState<DownloadSettings>(defaultSettings);

    const downloadsSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const historySaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const settingsSaveTimer = React.useRef<ReturnType<typeof setTimeout> | null>(null);
    const progressQueue = React.useRef<Map<string, { progress: number; speed?: string; eta?: string; queuedAt: number }>>(new Map());
    const progressRaf = React.useRef<number | null>(null);
    const pendingTerminalState = React.useRef<Map<string, { status: 'completed' | 'error'; error?: string }>>(new Map());
    const videoInfoCache = React.useRef<Map<string, { data: VideoInfo; timestamp: number }>>(new Map());
    const videoInfoInflight = React.useRef<Map<string, Promise<{ success: boolean; data?: VideoInfo; error?: string }>>>(new Map());
    const quickVideoInfoCache = React.useRef<Map<string, { data: VideoInfo; timestamp: number }>>(new Map());
    const quickVideoInfoInflight = React.useRef<Map<string, Promise<{ success: boolean; data?: VideoInfo; error?: string }>>>(new Map());

    // Load history, downloads, and settings from localStorage on mount
    useEffect(() => {
        try {
            const savedSettings = localStorage.getItem(SETTINGS_STORAGE_KEY);
            const resolvedSettings: DownloadSettings = savedSettings
                ? { ...defaultSettings, ...JSON.parse(savedSettings) }
                : defaultSettings;

            setSettings(resolvedSettings);

            const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (resolvedSettings.historyEnabled && savedHistory) {
                setHistory(JSON.parse(savedHistory));
            } else {
                // Privacy-first behavior: never retain hidden history when tracking is off.
                setHistory([]);
                localStorage.removeItem(HISTORY_STORAGE_KEY);
            }

            const savedDownloads = localStorage.getItem(DOWNLOADS_STORAGE_KEY);
            if (savedDownloads) {
                // Restore downloads, marking any that were in progress as interrupted
                const parsedDownloads: DownloadItem[] = JSON.parse(savedDownloads);
                const restoredDownloads = parsedDownloads.map(d => {
                    if (d.status === 'downloading' || d.status === 'pending') {
                        // Mark interrupted downloads as error so user can retry
                        return { ...d, status: 'error' as const, error: 'Download was interrupted' };
                    }
                    return d;
                });
                setDownloads(restoredDownloads);
            }
        } catch (e) {
            console.error('Failed to load from localStorage:', e);
        }
    }, []);

    useEffect(() => () => {
        if (downloadsSaveTimer.current) clearTimeout(downloadsSaveTimer.current);
        if (historySaveTimer.current) clearTimeout(historySaveTimer.current);
        if (settingsSaveTimer.current) clearTimeout(settingsSaveTimer.current);
        if (progressRaf.current) cancelAnimationFrame(progressRaf.current);
    }, []);

    const scheduleSave = useCallback((key: string, value: unknown, timerRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>, enabled = true) => {
        if (!enabled) return;
        if (timerRef.current) {
            clearTimeout(timerRef.current);
        }
        timerRef.current = setTimeout(() => {
            try {
                localStorage.setItem(key, JSON.stringify(value));
            } catch (e) {
                console.error(`Failed to save ${key} to localStorage:`, e);
            }
        }, SAVE_DEBOUNCE_MS);
    }, []);

    useEffect(() => {
        scheduleSave(DOWNLOADS_STORAGE_KEY, downloads, downloadsSaveTimer);
    }, [downloads, scheduleSave]);

    useEffect(() => {
        scheduleSave(HISTORY_STORAGE_KEY, history, historySaveTimer, settings.historyEnabled);
    }, [history, settings.historyEnabled, scheduleSave]);

    useEffect(() => {
        if (settings.historyEnabled) return;

        if (historySaveTimer.current) {
            clearTimeout(historySaveTimer.current);
            historySaveTimer.current = null;
        }

        if (history.length > 0) {
            setHistory([]);
        }

        localStorage.removeItem(HISTORY_STORAGE_KEY);
    }, [settings.historyEnabled, history]);

    useEffect(() => {
        scheduleSave(SETTINGS_STORAGE_KEY, settings, settingsSaveTimer);
    }, [settings, scheduleSave]);

    // Sync notification settings to main process
    useEffect(() => {
        if (window.electronAPI?.updateNotificationSettings) {
            window.electronAPI.updateNotificationSettings(settings.enableNotifications);
        }
    }, [settings.enableNotifications]);

    // Add completed download to history
    const addToHistory = useCallback((item: DownloadItem) => {
        if (!settings.historyEnabled) return;

        // Use URL-based ID to prevent duplicates of the same video
        // This ensures re-downloading the same video updates the existing entry
        const historyId = btoa(item.url).replace(/[^a-zA-Z0-9]/g, '').slice(0, 20);

        const historyItem: HistoryItem = {
            id: historyId,
            title: item.title,
            url: item.url,
            thumbnail: item.thumbnail,
            format: item.format || 'video',
            quality: item.quality,
            completedAt: new Date().toISOString(),
        };
        // Remove existing entry with same ID before adding new one (update)
        setHistory(prev => {
            const filtered = prev.filter(h => h.id !== historyId);
            return [historyItem, ...filtered].slice(0, 100); // Keep max 100 items
        });
    }, [settings.historyEnabled]);

    useEffect(() => {
        const api = window.electronAPI;
        if (!api?.onDownloadProgress || !api.onDownloadComplete || !api.onDownloadError) return;

        const flushProgress = () => {
            const consumedIds = new Set<string>();
            const now = Date.now();

            setDownloads(prev => prev.map(d => {
                const update = progressQueue.current.get(d.id);
                if (!update) return d;
                consumedIds.add(d.id);

                // Ignore late progress packets after completion to prevent
                // accidental UI regression back to "downloading".
                if (d.status === 'completed') {
                    return d;
                }

                return { ...d, progress: update.progress, speed: update.speed, eta: update.eta, status: 'downloading' };
            }));

            consumedIds.forEach((id) => progressQueue.current.delete(id));

            // Drop stale unmatched packets after 30s to avoid unbounded growth.
            for (const [id, update] of progressQueue.current.entries()) {
                if (now - update.queuedAt > 30000) {
                    progressQueue.current.delete(id);
                }
            }

            if (progressQueue.current.size > 0) {
                progressRaf.current = requestAnimationFrame(flushProgress);
            } else {
                progressRaf.current = null;
            }
        };

        const handleProgress = ({ id, progress, speed, eta }: { id: string; progress: number; speed?: string; eta?: string }) => {
            progressQueue.current.set(id, { progress, speed, eta, queuedAt: Date.now() });
            if (!progressRaf.current) {
                progressRaf.current = requestAnimationFrame(flushProgress);
            }
        };

        const handleComplete = ({ id }: { id: string }) => {
            setDownloads(prev => {
                let matched = false;
                const updatedDownloads = prev.map(d => {
                    if (d.id === id) {
                        matched = true;
                        const completedItem = {
                            ...d,
                            status: 'completed' as const,
                            progress: 100,
                            speed: undefined,
                            eta: undefined,
                        };
                        // Add to history
                        addToHistory(completedItem);
                        return completedItem;
                    }
                    return d;
                });

                if (!matched) {
                    pendingTerminalState.current.set(id, { status: 'completed' });
                }

                return updatedDownloads;
            });
        };

        const handleError = ({ id, error }: { id: string; error: string }) => {
            console.error("Download error:", error);
            setDownloads(prev => {
                let matched = false;
                const updated = prev.map(d => {
                    if (d.id !== id) return d;
                    matched = true;
                    return { ...d, status: 'error' as const, error };
                });

                if (!matched) {
                    pendingTerminalState.current.set(id, { status: 'error', error });
                }

                return updated;
            });
        };

        const unsubscribeProgress = api.onDownloadProgress(handleProgress);
        const unsubscribeComplete = api.onDownloadComplete(handleComplete);
        const unsubscribeError = api.onDownloadError(handleError);

        return () => {
            unsubscribeProgress();
            unsubscribeComplete();
            unsubscribeError();
        };
    }, [addToHistory]);

    const getVideoInfo = useCallback(async (url: string) => {
        const now = Date.now();
        const cacheKey = `${settings.cookiesFromBrowser || 'public'}:${getMetadataCacheKey(url)}`;
        const cached = videoInfoCache.current.get(cacheKey);
        if (cached && now - cached.timestamp < CACHE_TTL_MS) {
            return { success: true, data: cached.data } as const;
        }

        const inflight = videoInfoInflight.current.get(cacheKey);
        if (inflight) return inflight;

        const request = (async () => {
            try {
                let result;
                if (window.electronAPI?.getVideoInfo) {
                    result = await window.electronAPI.getVideoInfo(url, settings.cookiesFromBrowser || undefined);
                } else {
                    result = {
                        success: true,
                        data: {
                            id: 'mock-id',
                            title: 'Mock Video Title',
                            thumbnail: 'https://via.placeholder.com/320x180',
                            duration: 245,
                            uploader: 'Mock Channel',
                            view_count: 12345,
                            videoQualities: [1080, 720, 480],
                            videoQualitySizes: {
                                '1080': 220000000,
                                '720': 130000000,
                                '480': 70000000,
                            },
                        }
                    };
                }

                if (result.success && result.data) {
                    videoInfoCache.current.set(cacheKey, { data: result.data, timestamp: Date.now() });
                }
                return result;
            } finally {
                // Always clear in-flight marker, including rejected requests.
                videoInfoInflight.current.delete(cacheKey);
            }
        })();

        videoInfoInflight.current.set(cacheKey, request);
        return request;
    }, [settings.cookiesFromBrowser]);

    const getFastVideoInfo = useCallback(async (url: string) => {
        const cacheKey = getMetadataCacheKey(url);
        const now = Date.now();
        const cached = quickVideoInfoCache.current.get(cacheKey);
        if (cached && now - cached.timestamp < QUICK_CACHE_TTL_MS) {
            return { success: true, data: cached.data } as const;
        }

        const inflight = quickVideoInfoInflight.current.get(cacheKey);
        if (inflight) return inflight;

        const request = (async () => {
            try {
                let result;
                if (window.electronAPI?.getVideoInfoFast) {
                    result = await window.electronAPI.getVideoInfoFast(url);
                } else {
                    result = await getVideoInfo(url);
                }

                if (result.success && result.data) {
                    quickVideoInfoCache.current.set(cacheKey, { data: result.data, timestamp: Date.now() });
                }
                return result;
            } finally {
                quickVideoInfoInflight.current.delete(cacheKey);
            }
        })();

        quickVideoInfoInflight.current.set(cacheKey, request);
        return request;
    }, [getVideoInfo]);

    const addDownload = useCallback(async (
        url: string,
        format: 'video' | 'audio' | 'photo' = 'video',
        quality?: string,
        outputDirOrOptions?: string | AddDownloadOptions
    ) => {
        let seededDownloadId: string | undefined;
        try {
            const parsedOptions: AddDownloadOptions = typeof outputDirOrOptions === 'string'
                ? { outputDir: outputDirOrOptions }
                : (outputDirOrOptions || {});

            const turboEnabled = parsedOptions.turboOverride?.enabled ?? settings.enableTurboDownload;
            const adaptiveTurbo = parsedOptions.turboOverride?.adaptive ?? settings.adaptiveTurboDownload;
            const turboConnections = parsedOptions.turboOverride?.connections ?? settings.turboConnections;

            const infoResult = await getVideoInfo(url);
            const info = infoResult.success ? infoResult.data : null;

            // Keep downloader input as the original page URL.
            // Main process fallback logic performs generic direct-media extraction and validation.
            const targetUrl = url;

            const downloadOptions = {
                id: Math.random().toString(36).substr(2, 9),
                url: targetUrl,
                titleOverride: info?.title,
                format,
                quality,
                photoTimestampMode: parsedOptions.photoTimestampMode,
                cookiesFromBrowser: settings.cookiesFromBrowser,
                embedSubtitles: settings.embedSubtitles,
                subtitleLanguages: settings.subtitleLanguages,
                embedMetadata: settings.embedMetadata,
                preserveThumbnail: settings.preserveThumbnail,
                embedAltAudio: settings.embedAltAudio,
                preferredAudioLang: settings.preferredAudioLang,
                enableTurboDownload: turboEnabled,
                adaptiveTurboDownload: adaptiveTurbo,
                turboConnections,
                outputDir: parsedOptions.outputDir,
                fileNameTemplate: settings.fileNameTemplate,
            };
            seededDownloadId = downloadOptions.id;

            const seededItem: DownloadItem = {
                id: downloadOptions.id,
                url,
                title: info?.title || 'Preparing download...',
                thumbnail: info?.thumbnail,
                progress: 0,
                status: 'pending',
                format,
                quality,
                outputDir: parsedOptions.outputDir,
                enableTurboDownload: turboEnabled,
                adaptiveTurboDownload: adaptiveTurbo,
                turboConnections,
                photoTimestampMode: parsedOptions.photoTimestampMode,
            };

            setDownloads(prev => {
                const pending = pendingTerminalState.current.get(seededItem.id);
                if (!pending) {
                    return [seededItem, ...prev];
                }

                pendingTerminalState.current.delete(seededItem.id);
                const resolved = pending.status === 'completed'
                    ? { ...seededItem, status: 'completed' as const, progress: 100 }
                    : { ...seededItem, status: 'error' as const, error: pending.error };

                if (pending.status === 'completed') {
                    addToHistory(resolved);
                }

                return [resolved, ...prev];
            });

            let result;
            if (window.electronAPI?.startDownload) {
                result = await window.electronAPI.startDownload(downloadOptions);
            } else {
                console.warn('IPC not available, mocking download');
                const newItem: DownloadItem = {
                    id: downloadOptions.id,
                    url,
                    title: info?.title || 'Mock Download',
                    thumbnail: info?.thumbnail,
                    progress: 0,
                    status: 'pending',
                    format,
                    quality,
                    outputDir: parsedOptions.outputDir,
                    enableTurboDownload: turboEnabled,
                    adaptiveTurboDownload: adaptiveTurbo,
                    turboConnections,
                    photoTimestampMode: parsedOptions.photoTimestampMode,
                };
                setDownloads(prev => prev.map(d => d.id === downloadOptions.id ? newItem : d));

                let progress = 0;
                const interval = setInterval(() => {
                    progress += Math.random() * 15;
                    if (progress >= 100) {
                        clearInterval(interval);
                        setDownloads(prev => prev.map(d => {
                            if (d.id === downloadOptions.id) {
                                const completed = { ...d, status: 'completed' as const, progress: 100 };
                                addToHistory(completed);
                                return completed;
                            }
                            return d;
                        }));
                    } else {
                        setDownloads(prev => prev.map(d =>
                            d.id === downloadOptions.id ? { ...d, status: 'downloading', progress, speed: '1.5 MB/s', eta: '00:15' } : d
                        ));
                    }
                }, 500);
                return;
            }

            if (!result || result.status !== 'started') {
                throw new Error(result?.error || 'Download did not start');
            }

            if (result?.id && result.id !== downloadOptions.id) {
                setDownloads(prev => prev.map(d => d.id === downloadOptions.id ? { ...d, id: result.id } : d));
            }
        } catch (e) {
            console.error('Failed to start download', e);
            if (!seededDownloadId) return;
            const message = e instanceof Error ? e.message : 'Failed to start download';
            setDownloads(prev => prev.map(d =>
                d.id === seededDownloadId
                    ? { ...d, status: 'error', error: message }
                    : d
            ));
        }
    }, [getVideoInfo, addToHistory, settings]);

    const removeDownload = useCallback((id: string) => {
        setDownloads(prev => prev.filter(d => d.id !== id));
    }, []);

    const cancelDownload = useCallback(async (id: string) => {
        try {
            let result: any = { success: false };
            if (window.electronAPI?.cancelDownload) {
                result = await window.electronAPI.cancelDownload(id);
            } else {
                result = { success: true };
            }

            if (!result?.success) {
                throw new Error(result?.error || 'Cancel request was not accepted');
            }

            setDownloads(prev => prev.filter(d => d.id !== id));
        } catch (e) {
            console.error('Failed to cancel download', e);
            throw e;
        }
    }, []);

    const pauseDownload = useCallback(async (id: string) => {
        try {
            let result: any = { success: false };
            if (window.electronAPI?.pauseDownload) {
                result = await window.electronAPI.pauseDownload(id);
            } else {
                result = { success: true };
            }

            if (!result?.success) {
                throw new Error(result?.error || 'Pause request was not accepted');
            }

            // Update status to paused
            setDownloads(prev => prev.map(d =>
                d.id === id ? { ...d, status: 'paused' as const } : d
            ));
        } catch (e) {
            console.error('Failed to pause download', e);
            throw e;
        }
    }, []);

    const resumeDownload = useCallback(async (id: string) => {
        try {
            // Get the paused download info
            const download = downloads.find(d => d.id === id);
            if (!download) return;

            // Resume will restart the download with the same URL
            // yt-dlp automatically resumes from partial files
            let resumed = false;
            if (window.electronAPI?.resumeDownload) {
                const result = await window.electronAPI.resumeDownload(id);
                if (result.success && result.options) {
                    // Restart the download
                    await window.electronAPI.startDownload({
                        ...result.options,
                        id // Keep same ID
                    });
                    resumed = true;
                }
            }

            // Fallback: if main process lost paused state (e.g. app restart),
            // restart using the same id so yt-dlp can continue partial files.
            if (!resumed) {
                const options = {
                    id,
                    url: download.url,
                    format: download.format || 'video',
                    quality: download.quality,
                    cookiesFromBrowser: settings.cookiesFromBrowser,
                    embedSubtitles: settings.embedSubtitles,
                    subtitleLanguages: settings.subtitleLanguages,
                    embedMetadata: settings.embedMetadata,
                    preserveThumbnail: settings.preserveThumbnail,
                    embedAltAudio: settings.embedAltAudio,
                    preferredAudioLang: settings.preferredAudioLang,
                    enableTurboDownload: download.enableTurboDownload ?? settings.enableTurboDownload,
                    adaptiveTurboDownload: download.adaptiveTurboDownload ?? settings.adaptiveTurboDownload,
                    turboConnections: download.turboConnections ?? settings.turboConnections,
                    photoTimestampMode: download.photoTimestampMode,
                    outputDir: download.outputDir,
                };

                if (window.electronAPI?.startDownload) {
                    await window.electronAPI.startDownload(options);
                    resumed = true;
                }
            }

            if (!resumed) {
                throw new Error('Unable to resume download');
            }

            // Update status to downloading
            setDownloads(prev => prev.map(d =>
                d.id === id ? { ...d, status: 'downloading' as const } : d
            ));
        } catch (e) {
            console.error('Failed to resume download', e);
            throw e;
        }
    }, [downloads, settings]);

    const cancelAllDownloads = useCallback(async () => {
        const cancellableIds = downloads
            .filter(d => d.status === 'pending' || d.status === 'downloading' || d.status === 'paused')
            .map(d => d.id);

        if (cancellableIds.length === 0) return;

        const results = await Promise.allSettled(cancellableIds.map(id => cancelDownload(id)));
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            throw new Error(`Failed to cancel ${failures.length} download(s)`);
        }
    }, [downloads, cancelDownload]);

    const stopAllDownloads = useCallback(async () => {
        const pausableIds = downloads
            .filter(d => d.status === 'downloading')
            .map(d => d.id);

        if (pausableIds.length === 0) return;

        const results = await Promise.allSettled(pausableIds.map(id => pauseDownload(id)));
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            throw new Error(`Failed to stop ${failures.length} download(s)`);
        }
    }, [downloads, pauseDownload]);

    const resumeAllDownloads = useCallback(async () => {
        const resumableIds = downloads
            .filter(d => d.status === 'paused')
            .map(d => d.id);

        if (resumableIds.length === 0) return;

        const results = await Promise.allSettled(resumableIds.map(id => resumeDownload(id)));
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
            throw new Error(`Failed to resume ${failures.length} download(s)`);
        }
    }, [downloads, resumeDownload]);

    const boostDownload = useCallback(async (id: string) => {
        const download = downloads.find(d => d.id === id);
        if (!download) return;

        // Use a conservative boost floor that is faster but still stable for most hosts.
        const boostedConnections = Math.max(download.turboConnections || settings.turboConnections || 8, 12);

        const boostedOptions = {
            id,
            url: download.url,
            format: download.format || 'video',
            quality: download.quality,
            cookiesFromBrowser: settings.cookiesFromBrowser,
            embedSubtitles: settings.embedSubtitles,
            subtitleLanguages: settings.subtitleLanguages,
            embedMetadata: settings.embedMetadata,
            preserveThumbnail: settings.preserveThumbnail,
            embedAltAudio: settings.embedAltAudio,
            preferredAudioLang: settings.preferredAudioLang,
            enableTurboDownload: true,
            adaptiveTurboDownload: false,
            turboConnections: boostedConnections,
            photoTimestampMode: download.photoTimestampMode,
            outputDir: download.outputDir,
        };

        try {
            if (window.electronAPI?.pauseDownload) {
                await window.electronAPI.pauseDownload(id);
            }

            if (window.electronAPI?.startDownload) {
                await window.electronAPI.startDownload(boostedOptions);
            }

            setDownloads(prev => prev.map(d =>
                d.id === id
                    ? {
                        ...d,
                        status: 'downloading' as const,
                        enableTurboDownload: true,
                        adaptiveTurboDownload: false,
                        turboConnections: boostedConnections,
                        eta: 'boosting...',
                    }
                    : d
            ));
        } catch (e) {
            console.error('Failed to boost download', e);
            throw e;
        }
    }, [downloads, settings]);

    const retryDownload = useCallback(async (id: string) => {
        const download = downloads.find(d => d.id === id);
        if (!download) return;

        // Try resume path first to reuse partial files.
        try {
            await resumeDownload(id);
            return;
        } catch {
            // Fallback for environments without resume support.
        }

        removeDownload(id);
        await addDownload(download.url, download.format, download.quality, {
            outputDir: download.outputDir,
            turboOverride: {
                enabled: download.enableTurboDownload ?? settings.enableTurboDownload,
                adaptive: download.adaptiveTurboDownload ?? settings.adaptiveTurboDownload,
                connections: download.turboConnections ?? settings.turboConnections,
            },
            photoTimestampMode: download.photoTimestampMode,
        });
    }, [downloads, resumeDownload, removeDownload, addDownload, settings]);

    const clearCompleted = useCallback(() => {
        setDownloads(prev => prev.filter(d => d.status !== 'completed' && d.status !== 'error'));
    }, []);

    const clearHistory = useCallback(() => {
        setHistory([]);
        setDownloads(prev => removeAllTerminalDownloads(prev));
        localStorage.removeItem(HISTORY_STORAGE_KEY);
    }, []);

    const removeFromHistory = useCallback((id: string) => {
        const removedItem = history.find(item => item.id === id);
        setHistory(prev => prev.filter(h => h.id !== id));
        if (removedItem) {
            setDownloads(prev => removeRelatedTerminalDownloads(prev, removedItem.url));
        }
    }, [history]);

    const updateSettings = useCallback((newSettings: Partial<DownloadSettings>) => {
        setSettings(prev => ({ ...prev, ...newSettings }));
    }, []);

    const searchVideos = useCallback(async (query: string, platform: string, count: number = 20) => {
        if (window.electronAPI?.searchVideos) {
            return await window.electronAPI.searchVideos(query, platform, count);
        }
        // Mock for browser testing
        return {
            success: true,
            data: {
                query,
                platform,
                results: []
            }
        };
    }, []);

    const getPlaylistInfo = useCallback(async (url: string) => {
        if (window.electronAPI?.getPlaylistInfo) {
            return await window.electronAPI.getPlaylistInfo(url);
        }
        // Mock for browser testing
        return {
            success: false,
            error: 'Playlist info not available in browser mode'
        };
    }, []);

    const getAvailableBrowsers = useCallback(async () => {
        if (window.electronAPI?.getAvailableBrowsers) {
            return await window.electronAPI.getAvailableBrowsers();
        }
        // Mock for browser testing
        return {
            success: true,
            browsers: [
                { id: 'chrome', name: 'Google Chrome' },
                { id: 'firefox', name: 'Mozilla Firefox' },
                { id: 'edge', name: 'Microsoft Edge' },
            ]
        };
    }, []);

    const validateBrowserCookies = useCallback(async (browser: string) => {
        if (window.electronAPI?.validateBrowserCookies) {
            return await window.electronAPI.validateBrowserCookies(browser);
        }
        // Mock for browser testing
        return {
            success: false,
            status: 'unknown',
            isValid: false,
            browser,
            message: 'Cannot validate cookies in browser mode'
        };
    }, []);

    return (
        <DownloadContext.Provider value={{
            downloads,
            history,
            settings,
            addDownload,
            removeDownload,
            cancelDownload,
            pauseDownload,
            resumeDownload,
            cancelAllDownloads,
            stopAllDownloads,
            resumeAllDownloads,
            boostDownload,
            retryDownload,
            clearCompleted,
            clearHistory,
            removeFromHistory,
            updateSettings,
            getVideoInfo,
            getFastVideoInfo,
            searchVideos,
            getPlaylistInfo,
            getAvailableBrowsers,
            validateBrowserCookies,
        }}>
            {children}
        </DownloadContext.Provider>
    );
};

export const useDownloads = () => {
    const context = useContext(DownloadContext);
    if (context === undefined) {
        throw new Error('useDownloads must be used within a DownloadProvider');
    }
    return context;
};
