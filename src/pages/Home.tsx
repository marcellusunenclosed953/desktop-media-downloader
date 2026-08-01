import React, { useState, useEffect, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { useDownloads, VideoInfo } from '../context/DownloadContext';
import {
    ArrowRight,
    Link as LinkIcon,
    Video,
    Music,
    Image as ImageIcon,
    Camera,
    Pause,
    Play,
    Trash2,
    X,
    Clipboard,
    Search,
    ListVideo,
    Zap
} from 'lucide-react';
import DownloadCard from '../components/DownloadCard';
import FormatSelector from '../components/FormatSelector';
import UrlPreview from '../components/UrlPreview';
import SearchModal from '../components/SearchModal';
import PlaylistModal from '../components/PlaylistModal';
import DesktopMediaLogo from '../components/DesktopMediaLogo';
import { cn } from '../lib/utils';
import { createImmediateVideoPreview, isCompleteMediaUrl } from '../lib/videoPreview';
import { motion, AnimatePresence } from 'framer-motion';

// Window types are defined in vite-env.d.ts

const Home: React.FC = () => {
    const { t } = useTranslation();
    const [url, setUrl] = useState('');
    const [showFormatSelector, setShowFormatSelector] = useState(false);
    const [showSearchModal, setShowSearchModal] = useState(false);
    const [showPlaylistModal, setShowPlaylistModal] = useState(false);
    const [videoInfo, setVideoInfo] = useState<VideoInfo | null>(null);
    const [isLoadingInfo, setIsLoadingInfo] = useState(false);
    const [isEnrichingInfo, setIsEnrichingInfo] = useState(false);
    const [infoError, setInfoError] = useState<string | undefined>();
    const [isPlaylistUrl, setIsPlaylistUrl] = useState(false);
    const [clipboardUrl, setClipboardUrl] = useState<string | null>(null);

    const {
        addDownload,
        downloads,
        cancelDownload,
        pauseDownload,
        resumeDownload,
        cancelAllDownloads,
        stopAllDownloads,
        resumeAllDownloads,
        boostDownload,
        retryDownload,
        clearCompleted,
        getVideoInfo,
        getFastVideoInfo,
        settings,
    } = useDownloads();

    const hasTimestampMarker = (urlStr: string): boolean => {
        if (!urlStr) return false;

        try {
            const parsed = new URL(urlStr);
            const maybeTimestamp = parsed.searchParams.get('t')
                || parsed.searchParams.get('start')
                || parsed.searchParams.get('time_continue');
            if (maybeTimestamp && maybeTimestamp.trim().length > 0) return true;

            const hash = parsed.hash.replace(/^#/, '').trim();
            if (!hash) return false;

            if (/^(t|start)=/i.test(hash)) return true;
            return /^\d+(?:\.\d+)?$/.test(hash) || /^\d+h(?:\d+m)?(?:\d+s)?$/i.test(hash) || /^\d+m(?:\d+s)?$/i.test(hash);
        } catch {
            return /[?&#](t|start|time_continue)=/i.test(urlStr) || /#(?:t|start)=/i.test(urlStr);
        }
    };

    const hasTimestampInUrl = hasTimestampMarker(url);

    const isDirectPlaylistUrl = (urlStr: string): boolean => {
        if (!urlStr) return false;

        try {
            const parsed = new URL(urlStr);
            const host = parsed.hostname.toLowerCase();
            const isYouTubeHost = host.includes('youtube.com') || host.includes('youtu.be');
            if (!isYouTubeHost) return false;

            // Treat canonical playlist links as direct playlist mode.
            return parsed.pathname.includes('/playlist') && parsed.searchParams.has('list');
        } catch {
            return false;
        }
    };

    // Check if URL has playlist context (either direct playlist or video-with-list)
    const checkIfPlaylist = (urlStr: string): boolean => {
        if (!urlStr) return false;

        try {
            const parsed = new URL(urlStr);
            const hasList = parsed.searchParams.has('list');
            return hasList ||
                parsed.pathname.includes('/playlist') ||
                urlStr.includes('/playlist/') ||
                (urlStr.includes('@') && urlStr.includes('/videos')) ||
                urlStr.includes('/channel/') ||
                urlStr.includes('/c/');
        } catch {
            return urlStr.includes('list=') ||
                urlStr.includes('playlist?list=') ||
                urlStr.includes('/playlist/');
        }
    };

    // Smart Clipboard Detection
    useEffect(() => {
        const checkClipboard = async () => {
            try {
                const text = await navigator.clipboard.readText();
                if (text && (text.includes('http://') || text.includes('https://'))) {
                    if (text !== url && text !== clipboardUrl) {
                        setClipboardUrl(text);
                    }
                }
            } catch (e) {
                // Ignore clipboard errors
            }
        };

        window.addEventListener('focus', checkClipboard);
        checkClipboard(); // Initial check

        return () => window.removeEventListener('focus', checkClipboard);
    }, [url, clipboardUrl]);

    // Fetch video info when URL is pasted
    const handleUrlChange = useCallback((newUrl: string) => {
        setUrl(newUrl);
        setVideoInfo(null);
        setInfoError(undefined);
        setIsPlaylistUrl(checkIfPlaylist(newUrl));
        setClipboardUrl(null);

        if (isDirectPlaylistUrl(newUrl)) {
            setShowPlaylistModal(true);
        }
    }, []);

    // Debounced info fetch to avoid spamming IPC while typing
    useEffect(() => {
        if (!url || !isCompleteMediaUrl(url)) {
            setIsLoadingInfo(false);
            setIsEnrichingInfo(false);
            setInfoError(undefined);
            setVideoInfo(null);
            return;
        }

        // Playlist links should open playlist flow directly instead of video-info probing.
        if (isDirectPlaylistUrl(url)) {
            setIsLoadingInfo(false);
            setIsEnrichingInfo(false);
            setInfoError(undefined);
            setVideoInfo(null);
            return;
        }

        let cancelled = false;
        let completeInfoReceived = false;
        let hasQuickPreview = true;
        setVideoInfo(createImmediateVideoPreview(url));
        setInfoError(undefined);
        setIsLoadingInfo(false);
        setIsEnrichingInfo(true);

        const timer = setTimeout(() => {
            // Start both requests together: the fast path paints the card first,
            // while yt-dlp continues resolving formats and precise media details.
            void getFastVideoInfo(url).then((result) => {
                if (cancelled || completeInfoReceived) return;
                if (result.success && result.data) {
                    hasQuickPreview = true;
                    setVideoInfo(result.data);
                    setInfoError(undefined);
                    setIsLoadingInfo(false);
                }
            }).catch(() => {
                // The detailed request remains authoritative and may still succeed.
            });

            void getVideoInfo(url).then((result) => {
                if (cancelled) return;
                if (result.success && result.data) {
                    completeInfoReceived = true;
                    setVideoInfo(result.data);
                    setInfoError(undefined);
                } else if (!hasQuickPreview) {
                    setInfoError(result.error || 'Could not fetch video info');
                    setVideoInfo(null);
                }
            }).catch((error) => {
                if (!cancelled && !hasQuickPreview) {
                    console.error('Error fetching video info:', error);
                    setInfoError('Failed to fetch video information');
                    setVideoInfo(null);
                }
            }).finally(() => {
                if (!cancelled) {
                    setIsLoadingInfo(false);
                    setIsEnrichingInfo(false);
                }
            });
        }, 80);

        return () => {
            cancelled = true;
            clearTimeout(timer);
        };
    }, [url, getFastVideoInfo, getVideoInfo]);

    const handlePaste = async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text && (text.includes('http://') || text.includes('https://'))) {
                handleUrlChange(text);
            }
        } catch (e) {
            console.error('Failed to read clipboard', e);
        }
    };

    const handleDownload = (e: React.FormEvent) => {
        e.preventDefault();
        if (!url) return;

        if (isDirectPlaylistUrl(url)) {
            setShowPlaylistModal(true);
            return;
        }

        setShowFormatSelector(true);
    };

    const handleFormatSelect = async (
        format: 'video' | 'audio' | 'photo',
        quality?: string,
        outputDir?: string,
        turboOverride?: { enabled: boolean; adaptive?: boolean; connections?: number },
        photoTimestampMode?: 'screenshot' | 'thumbnail'
    ) => {
        setShowFormatSelector(false);
        await addDownload(url, format, quality, {
            outputDir,
            turboOverride,
            photoTimestampMode,
        });
        setUrl('');
        setVideoInfo(null);
    };

    const handleOpenFolder = async (folderPath?: string) => {
        if (window.electronAPI?.openFolder) {
            await window.electronAPI.openFolder(folderPath);
            return;
        }

        if (window.electronAPI?.openDownloadsFolder) {
            await window.electronAPI.openDownloadsFolder();
        }
    };

    const activeDownloads = downloads.filter(d => d.status !== 'completed' && d.status !== 'error');
    const completedDownloads = downloads.filter(d => d.status === 'completed' || d.status === 'error');
    const homeStoppableCount = downloads.filter(d => d.status === 'downloading').length;
    const homeResumableCount = downloads.filter(d => d.status === 'paused').length;

    return (
        <div className="h-full w-full bg-transparent flex flex-col gap-6 p-8 lg:p-10 overflow-auto scroll-smooth">
            <div className="flex flex-col gap-4 lg:flex-row">
                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45 }}
                    className="panel flex-1 p-6 lg:p-7"
                >
                    <div className="flex flex-col gap-3">
                        <div className="flex items-center gap-2 text-sm text-foreground/60">
                            <DesktopMediaLogo compact className="shrink-0" />
                            <span className="section-title">{t('home.brand')}</span>
                        </div>
                        <h1 className="text-3xl lg:text-4xl font-semibold tracking-tight text-foreground">
                            {t('home.title')}
                        </h1>
                        <p className="text-foreground/65 text-sm leading-relaxed max-w-2xl">
                            {t('home.subtitle')}
                        </p>
                        <div className="flex gap-4 flex-wrap mt-1 text-xs text-foreground/55">
                            <span>{t('home.livePreview')}</span>
                            <span>{t('home.playlistAware')}</span>
                            <span>{t('home.quickActions')}</span>
                        </div>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 12 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.45, delay: 0.05 }}
                    className="panel min-w-[240px] p-5 flex items-center gap-4"
                >
                    <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.14em] text-foreground/50">{t('home.active')}</p>
                        <p className="text-2xl font-semibold text-foreground">{downloads.filter(d => d.status !== 'completed' && d.status !== 'error').length}</p>
                    </div>
                    <div className="h-12 w-px bg-foreground/10" />
                    <div className="flex-1">
                        <p className="text-xs uppercase tracking-[0.14em] text-foreground/50">{t('home.completed')}</p>
                        <p className="text-2xl font-semibold text-foreground">{downloads.filter(d => d.status === 'completed').length}</p>
                    </div>
                </motion.div>
            </div>

            <motion.form
                onSubmit={handleDownload}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.45, delay: 0.08 }}
                className="panel p-4 lg:p-5 relative"
            >
                <div className="relative flex flex-col gap-4">
                    <div className="flex flex-col lg:flex-row lg:items-center gap-3">
                        <div className="flex items-center gap-3 rounded-xl bg-foreground/5 px-3 py-2 text-sm text-foreground/70">
                            <LinkIcon className="w-5 h-5 text-primary" />
                            <span>{t('home.pasteAnyLink')}</span>
                        </div>
                        {clipboardUrl && !url && (
                            <button
                                type="button"
                                onClick={() => handleUrlChange(clipboardUrl)}
                                className="flex items-center gap-2 px-3 py-2 rounded-xl text-xs bg-primary/15 text-primary border border-primary/20 hover:bg-primary/25 transition-colors"
                            >
                                <Zap className="w-4 h-4" />
                                {t('home.pasteDetected')}
                            </button>
                        )}
                    </div>

                    <div className="relative flex items-center bg-secondary/50 border border-foreground/10 rounded-2xl p-3 focus-within:border-primary/50 transition-all shadow-sm">
                        <input
                            type="text"
                            value={url}
                            onChange={(e) => handleUrlChange(e.target.value)}
                            placeholder="https://youtu.be/..."
                            className="flex-1 bg-transparent border-none focus:ring-0 text-foreground placeholder:text-foreground/40 h-12 px-2 outline-none text-base"
                        />
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={handlePaste}
                                className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                                title="Paste from clipboard"
                            >
                                <Clipboard className="w-4 h-4" />
                            </button>
                            <button
                                type="submit"
                                disabled={!url}
                                className={cn(
                                    "h-10 px-6 rounded-xl font-medium transition-all flex items-center gap-2 shadow-lg",
                                    url
                                        ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                        : "bg-secondary text-foreground/30 cursor-not-allowed"
                                )}
                            >
                                {t('home.download')} <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-2 flex-wrap">
                        <button
                            type="button"
                            onClick={() => {
                                if (url) {
                                    addDownload(url, 'video', settings.defaultQuality);
                                    setUrl('');
                                    setVideoInfo(null);
                                }
                            }}
                            disabled={!url}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border",
                                url
                                    ? "border-primary/20 bg-primary/10 text-foreground"
                                    : "border-foreground/10 bg-secondary/40 text-foreground/40"
                            )}
                        >
                            <Video className="w-3.5 h-3.5" />
                            {t('home.quickVideo')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (url) {
                                    addDownload(url, 'audio');
                                    setUrl('');
                                    setVideoInfo(null);
                                }
                            }}
                            disabled={!url}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border",
                                url
                                    ? "border-accent/20 bg-accent/10 text-foreground"
                                    : "border-foreground/10 bg-secondary/40 text-foreground/40"
                            )}
                        >
                            <Music className="w-3.5 h-3.5" />
                            {t('home.quickAudio')}
                        </button>
                        <button
                            type="button"
                            onClick={() => {
                                if (url) {
                                    addDownload(url, 'photo', undefined, {
                                        photoTimestampMode: 'thumbnail',
                                    });
                                    setUrl('');
                                    setVideoInfo(null);
                                }
                            }}
                            disabled={!url}
                            className={cn(
                                "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border",
                                url
                                    ? "border-warning/30 bg-warning/10 text-foreground"
                                    : "border-foreground/10 bg-secondary/40 text-foreground/40"
                            )}
                        >
                            <ImageIcon className="w-3.5 h-3.5" />
                            {t('home.thumbnail')}
                        </button>
                        {hasTimestampInUrl && (
                            <button
                                type="button"
                                onClick={() => {
                                    if (url) {
                                        addDownload(url, 'photo', undefined, {
                                            photoTimestampMode: 'screenshot',
                                        });
                                        setUrl('');
                                        setVideoInfo(null);
                                    }
                                }}
                                disabled={!url}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border",
                                    url
                                        ? "border-warning/40 bg-warning/15 text-foreground"
                                        : "border-foreground/10 bg-secondary/40 text-foreground/40"
                                )}
                            >
                                <Camera className="w-3.5 h-3.5" />
                                {t('home.screenshot')}
                            </button>
                        )}
                        <button
                            type="button"
                            onClick={() => setShowSearchModal(true)}
                            className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border border-foreground/10 bg-secondary/60 text-foreground hover:border-primary/30"
                        >
                            <Search className="w-3.5 h-3.5" />
                            {t('home.search')}
                        </button>
                        {isPlaylistUrl && (
                            <button
                                type="button"
                                onClick={() => setShowPlaylistModal(true)}
                                className="flex items-center gap-2 px-4 py-2 rounded-xl text-xs font-medium transition-all border border-success/25 bg-success/10 text-foreground hover:border-success/40"
                            >
                                <ListVideo className="w-3.5 h-3.5" />
                                {t('home.openPlaylist')}
                            </button>
                        )}
                    </div>
                </div>
            </motion.form>

            {/* URL Preview */}
            <AnimatePresence>
                {(videoInfo || isLoadingInfo || infoError) && (
                    <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={{ opacity: 0, height: 0 }}
                        className="max-w-2xl mx-auto w-full"
                    >
                        <div className="glass-card rounded-2xl p-1">
                            <UrlPreview
                                videoInfo={videoInfo}
                                isLoading={isLoadingInfo}
                                isEnriching={isEnrichingInfo}
                                error={infoError}
                                onDownload={() => setShowFormatSelector(true)}
                            />
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Active Downloads */}
            {activeDownloads.length > 0 && (
                <div className="max-w-2xl mx-auto w-full space-y-3">
                    <div className="flex items-center justify-between gap-2 mb-2">
                        <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4 text-primary" />
                            <h2 className="text-sm font-semibold text-foreground">{t('home.activeDownloads')}</h2>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                type="button"
                                onClick={() => void stopAllDownloads().catch(console.error)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-foreground/15 text-foreground/70 hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={homeStoppableCount === 0}
                                title={homeStoppableCount === 0 ? t('home.noRunningToStop') : t('home.stopAllRunning')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    <Pause className="w-3.5 h-3.5" />
                                    {t('home.stopAll')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => void resumeAllDownloads().catch(console.error)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-foreground/15 text-foreground/70 hover:text-foreground hover:border-primary/30 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                disabled={homeResumableCount === 0}
                                title={homeResumableCount === 0 ? t('home.noPausedToResume') : t('home.resumeAllPaused')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    <Play className="w-3.5 h-3.5" />
                                    {t('home.resumeAll')}
                                </span>
                            </button>
                            <button
                                type="button"
                                onClick={() => void cancelAllDownloads().catch(console.error)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-medium border border-foreground/20 text-foreground/55 hover:text-foreground hover:border-foreground/45 hover:bg-foreground/5 transition-colors"
                                title={t('home.cancelAllActive')}
                            >
                                <span className="inline-flex items-center gap-1">
                                    <X className="w-3.5 h-3.5" />
                                    {t('home.cancelAll')}
                                </span>
                            </button>
                        </div>
                    </div>
                    {activeDownloads.map(item => (
                        <DownloadCard
                            key={item.id}
                            item={item}
                            onCancel={cancelDownload}
                            onPause={pauseDownload}
                            onResume={resumeDownload}
                            onBoost={boostDownload}
                            onOpenFolder={handleOpenFolder}
                        />
                    ))}
                </div>
            )}

            {/* Completed Downloads */}
            {completedDownloads.length > 0 && (
                <div className="max-w-2xl mx-auto w-full space-y-3">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-sm font-semibold text-foreground/65">{t('home.recentHistory')}</h2>
                        <button
                            onClick={clearCompleted}
                            className="flex items-center gap-1 text-xs text-foreground/40 hover:text-foreground transition-colors"
                        >
                            <Trash2 className="w-3 h-3" />
                            {t('home.clear')}
                        </button>
                    </div>
                    {completedDownloads.slice(0, 3).map(item => (
                        <div key={item.id} className="opacity-70 hover:opacity-100 transition-opacity">
                            <DownloadCard
                                item={item}
                                onCancel={cancelDownload}
                                onRetry={retryDownload}
                                onOpenFolder={handleOpenFolder}
                            />
                        </div>
                    ))}
                </div>
            )}

            {/* Empty State */}
            {downloads.length === 0 && !videoInfo && !isLoadingInfo && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    className="flex-1 flex flex-col items-center justify-center text-center pb-10"
                >
                    <p className="text-foreground/20 text-sm font-light">
                        {t('home.readyToDownload')}
                    </p>
                </motion.div>
            )}

            {/* Format Selector Modal */}
            <FormatSelector
                isOpen={showFormatSelector}
                onClose={() => setShowFormatSelector(false)}
                onSelect={handleFormatSelect}
                availableQualities={videoInfo?.videoQualities}
                qualitySizes={videoInfo?.videoQualitySizes}
                isLoadingQualities={isEnrichingInfo}
                defaultQuality={settings.defaultQuality}
                defaultTurboEnabled={settings.enableTurboDownload}
                defaultAdaptiveTurbo={settings.adaptiveTurboDownload}
                defaultTurboConnections={settings.turboConnections}
                hasTimestampInUrl={hasTimestampInUrl}
            />

            {/* Search Modal */}
            <SearchModal
                isOpen={showSearchModal}
                onClose={() => setShowSearchModal(false)}
            />

            {/* Playlist Modal */}
            <PlaylistModal
                isOpen={showPlaylistModal}
                onClose={() => setShowPlaylistModal(false)}
                url={url}
            />
        </div>
    );
};

export default Home;
