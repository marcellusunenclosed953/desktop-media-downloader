import React, { useMemo, useState } from 'react';
import { X, Check, Pause, Play, Folder, AlertCircle, Youtube, Globe, Music, RefreshCw, Zap, Copy, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';

export interface DownloadItemData {
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
    error?: string;
}

interface DownloadCardProps {
    item: DownloadItemData;
    onCancel: (id: string) => void;
    onPause?: (id: string) => void;
    onResume?: (id: string) => void;
    onBoost?: (id: string) => void;
    onRetry?: (id: string) => void;
    onOpenFolder: (folderPath?: string) => void;
}

const getSourceIcon = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        return <Youtube className="w-4 h-4 text-foreground/65" />;
    }
    return <Globe className="w-4 h-4 text-foreground/65" />;
};

const getSourceLabel = (url: string) => {
    if (url.includes('youtube.com') || url.includes('youtu.be')) return 'YouTube';
    if (url.includes('vimeo.com')) return 'Vimeo';
    if (url.includes('tiktok.com')) return 'TikTok';
    if (url.includes('instagram.com')) return 'Instagram';
    if (url.includes('twitter.com') || url.includes('x.com')) return 'X';
    return 'Web';
};

const getTroubleshootingLink = (error?: string): string | null => {
    if (!error) return null;

    const normalized = error.toLowerCase();
    if (normalized.includes('ffmpeg')) {
        return 'https://ffmpeg.org/download.html';
    }
    if (normalized.includes('yt-dlp') || normalized.includes('not found on path') || normalized.includes('command not found')) {
        return 'https://github.com/yt-dlp/yt-dlp#installation';
    }

    return null;
};

const DownloadCard: React.FC<DownloadCardProps> = ({ item, onCancel, onPause, onResume, onBoost, onRetry, onOpenFolder }) => {
    const { t } = useTranslation();
    const [copiedDiagnostics, setCopiedDiagnostics] = useState(false);
    const isActive = item.status === 'downloading' || item.status === 'pending';
    const isPaused = item.status === 'paused';
    const isComplete = item.status === 'completed';
    const isError = item.status === 'error';
    const isRetrying = isActive && Boolean(item.eta && /retrying/i.test(item.eta));
    const isFinalizing = isActive && Boolean(item.eta && /finalizing/i.test(item.eta));
    const troubleshootingLink = useMemo(() => getTroubleshootingLink(item.error), [item.error]);
    const canBoost = isActive && Boolean(onBoost)
        && (!item.enableTurboDownload || item.adaptiveTurboDownload || (item.turboConnections || 0) < 12);

    const handleCopyDiagnostics = async () => {
        const details = [
            `Title: ${item.title}`,
            `Status: ${item.status}`,
            `URL: ${item.url}`,
            `Format: ${item.format || 'video'}`,
            `Quality: ${item.quality || 'default'}`,
            `Error: ${item.error || 'Unknown error'}`,
        ].join('\n');

        try {
            await navigator.clipboard.writeText(details);
            setCopiedDiagnostics(true);
            setTimeout(() => setCopiedDiagnostics(false), 1200);
        } catch {
            setCopiedDiagnostics(false);
        }
    };

    const handleOpenGuide = async () => {
        if (!troubleshootingLink) return;

        if (window.electronAPI?.openExternalUrl) {
            const result = await window.electronAPI.openExternalUrl(troubleshootingLink);
            if (!result.success) {
                window.open(troubleshootingLink, '_blank', 'noopener,noreferrer');
            }
            return;
        }

        window.open(troubleshootingLink, '_blank', 'noopener,noreferrer');
    };

    return (
        <div
            className={cn(
                'group relative bg-card/90 backdrop-blur-md border rounded-2xl p-4 transition-all duration-200 hover:bg-card overflow-hidden',
                isError
                    ? 'border-error/30 shadow-[0_0_12px_rgba(255,255,255,0.06)]'
                    : isComplete
                        ? 'border-success/25 hover:border-success/40'
                        : isPaused
                            ? 'border-warning/25'
                            : 'border-foreground/10 hover:border-foreground/30 hover:shadow-[0_6px_18px_rgba(0,0,0,0.2)]'
            )}
        >
            {/* Background progress fill for active downloads */}
            {(isActive || isPaused) && (
                <div
                    className={cn(
                        'absolute bottom-0 left-0 h-1 bg-gradient-to-r from-primary to-accent transition-all duration-300',
                        isPaused && 'from-warning/60 to-warning'
                    )}
                    style={{ width: `${item.progress}%`, opacity: 0.5 }}
                />
            )}

            <div className="flex gap-4 relative z-10">
                {/* Thumbnail */}
                <div className="relative w-28 h-20 rounded-xl overflow-hidden bg-secondary/60 flex-shrink-0 shadow-sm group-hover:scale-103 transition-transform duration-300">
                    {item.thumbnail ? (
                        <img
                            src={item.thumbnail}
                            alt={item.title}
                            className="w-full h-full object-cover"
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center">
                            {item.format === 'audio' ? (
                                <Music className="w-8 h-8 text-foreground/20" />
                            ) : item.format === 'photo' ? (
                                <svg
                                    xmlns="http://www.w3.org/2000/svg"
                                    width="32"
                                    height="32"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="2"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    className="text-foreground/20"
                                >
                                    <rect width="18" height="18" x="3" y="3" rx="2" ry="2" />
                                    <circle cx="9" cy="9" r="2" />
                                    <path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" />
                                </svg>
                            ) : (
                                getSourceIcon(item.url)
                            )}
                        </div>
                    )}

                    {/* Format badge */}
                    <div
                        className={cn(
                            'absolute bottom-1 right-1 px-2 py-0.5 rounded-md text-[10px] font-semibold uppercase backdrop-blur-md border border-foreground/10',
                            item.format === 'audio'
                                ? 'bg-accent/20 text-foreground'
                                : item.format === 'photo'
                                    ? 'bg-warning/25 text-foreground'
                                    : 'bg-primary/15 text-foreground'
                        )}
                    >
                        {item.format === 'audio' ? 'MP3' : item.format === 'photo' ? 'IMG' : item.quality || 'HD'}
                    </div>
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    {/* Title row */}
                    <div>
                        <div className="flex items-start justify-between gap-2">
                            <h3 className="font-medium text-sm truncate pr-2 text-foreground group-hover:text-primary transition-colors">
                                {item.title}
                            </h3>

                            {/* Actions Floating */}
                            <div className="flex items-center gap-1 flex-shrink-0 opacity-0 group-hover:opacity-100 transition-all duration-200 translate-x-2 group-hover:translate-x-0">
                                {isComplete && (
                                    <button onClick={() => onOpenFolder(item.outputDir)} className="p-1.5 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground" title={t('downloadCard.showInFolder')}>
                                        <Folder className="w-4 h-4" />
                                    </button>
                                )}
                                {isActive && onPause && (
                                    <button onClick={() => onPause(item.id)} className="p-1.5 rounded-lg hover:bg-warning/20 text-foreground/60 hover:text-warning" title={t('downloadCard.pause')}>
                                        <Pause className="w-4 h-4" />
                                    </button>
                                )}
                                {isPaused && onResume && (
                                    <button onClick={() => onResume(item.id)} className="p-1.5 rounded-lg hover:bg-success/20 text-foreground/60 hover:text-success" title={t('downloadCard.resume')}>
                                        <Play className="w-4 h-4" />
                                    </button>
                                )}
                                {canBoost && onBoost && (
                                    <button onClick={() => onBoost(item.id)} className="p-1.5 rounded-lg hover:bg-primary/20 text-foreground/60 hover:text-primary" title={t('downloadCard.boost')}>
                                        <Zap className="w-4 h-4" />
                                    </button>
                                )}
                                {(isActive || isPaused || isError) && (
                                    <button onClick={() => onCancel(item.id)} className="p-1.5 rounded-lg hover:bg-error/20 text-foreground/60 hover:text-error" title={t('downloadCard.cancel')}>
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                                {isError && onRetry && (
                                    <button onClick={() => onRetry(item.id)} className="p-1.5 rounded-lg hover:bg-success/20 text-foreground/60 hover:text-success" title={t('downloadCard.retry')}>
                                        <RefreshCw className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* Metadata Row */}
                        <div className="flex items-center gap-3 mt-1.5">
                            <div className="flex items-center gap-1.5 text-xs text-foreground/60 bg-secondary/60 px-2 py-0.5 rounded-full border border-foreground/10">
                                {getSourceIcon(item.url)}
                                <span>{getSourceLabel(item.url)}</span>
                            </div>

                            {isActive && item.speed && (
                                <span className="text-xs text-primary/80 font-mono">
                                    {item.speed}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Status & Footer */}
                    <div className="flex items-center justify-between mt-2">
                        <div className="text-xs">
                            {isComplete && <span className="text-success flex items-center gap-1"><Check className="w-3 h-3" /> {t('downloadCard.completed')}</span>}
                            {isError && <span className="text-error flex items-center gap-1"><AlertCircle className="w-3 h-3" /> {item.error || t('downloadCard.failed')}</span>}
                            {isPaused && <span className="text-warning flex items-center gap-1"><Pause className="w-3 h-3" /> {t('downloadCard.paused')} - {item.progress.toFixed(1)}%</span>}
                            {isActive && (
                                <span className={cn(isRetrying ? 'text-warning' : 'text-foreground/60')}>
                                    {item.progress.toFixed(1)}%
                                    {item.eta && ((isRetrying || isFinalizing) ? ` • ${item.eta}` : ` • ${item.eta} ${t('downloadCard.remaining')}`)}
                                </span>
                            )}
                        </div>
                    </div>

                    {isError && (
                        <div className="mt-2 flex flex-wrap items-center gap-2">
                            {onRetry && (
                                <button
                                    onClick={() => onRetry(item.id)}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-success/15 hover:bg-success/25 text-success"
                                    title={t('downloadCard.retryThis')}
                                >
                                    <RefreshCw className="w-3 h-3" />
                                    {t('downloadCard.retryBtn')}
                                </button>
                            )}

                            <button
                                onClick={() => void handleCopyDiagnostics()}
                                className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-foreground/[0.06] hover:bg-foreground/10 text-foreground/75"
                                title={t('downloadCard.copyDiagnostics')}
                            >
                                <Copy className="w-3 h-3" />
                                {copiedDiagnostics ? t('downloadCard.copiedDetails') : t('downloadCard.copyDetails')}
                            </button>

                            {troubleshootingLink && (
                                <button
                                    onClick={() => void handleOpenGuide()}
                                    className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs bg-primary/15 hover:bg-primary/25 text-primary"
                                    title={t('downloadCard.openGuide')}
                                >
                                    <ExternalLink className="w-3 h-3" />
                                    {t('downloadCard.installGuide')}
                                </button>
                            )}
                        </div>
                    )}
                </div>
            </div>

            {/* Dynamic Glow for Active State */}
            {isActive && (
                <div className="absolute -inset-[100px] bg-primary/20 blur-[100px] opacity-10 pointer-events-none group-hover:opacity-20 transition-opacity" />
            )}
        </div>
    );
};

export default DownloadCard;
