import React, { useState, useEffect, useCallback } from 'react';
import { X, ListVideo, Loader2, Download, Music, Clock, AlertTriangle, Check, CheckSquare, Square } from 'lucide-react';
import { useDownloads } from '../context/DownloadContext';
import { cn, runWithConcurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface PlaylistVideo {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    url: string;
    filesize_approx?: number;
}

interface PlaylistInfo {
    isPlaylist: boolean;
    id: string;
    title: string;
    thumbnail?: string;
    uploader?: string;
    videoCount: number;
    videos: PlaylistVideo[];
}

interface PlaylistModalProps {
    isOpen: boolean;
    onClose: () => void;
    url: string;
}

const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
};

const calculateTotalSize = (videos: PlaylistVideo[], selectedIds: Set<string>): number => {
    return videos
        .filter(v => selectedIds.has(v.id))
        .reduce((sum, v) => sum + (v.filesize_approx || 0), 0);
};

const LARGE_PLAYLIST_THRESHOLD = 50;

const CONCURRENCY_LIMIT = 4;

const PlaylistModal: React.FC<PlaylistModalProps> = ({ isOpen, onClose, url }) => {
    const { t } = useTranslation();
    const { getPlaylistInfo, addDownload, settings } = useDownloads();
    const [playlistInfo, setPlaylistInfo] = useState<PlaylistInfo | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());
    const [quality, setQuality] = useState(settings.defaultQuality);
    const [showWarning, setShowWarning] = useState(false);
    const [isDownloading, setIsDownloading] = useState(false);

    useEffect(() => {
        if (isOpen && url) {
            fetchPlaylistInfo();
        }
    }, [isOpen, url]);

    const fetchPlaylistInfo = useCallback(async () => {
        setIsLoading(true);
        setError(null);
        setPlaylistInfo(null);
        setSelectedVideos(new Set());

        try {
            const response = await getPlaylistInfo(url);
            if (response.success && response.data) {
                const info = response.data as PlaylistInfo;
                setPlaylistInfo(info);
                // Select all videos by default
                setSelectedVideos(new Set(info.videos.map(v => v.id)));
                // Show warning for large playlists
                if (info.videos.length >= LARGE_PLAYLIST_THRESHOLD) {
                    setShowWarning(true);
                }
            } else {
                setError(response.error || 'Failed to load playlist');
            }
        } catch (e) {
            setError('Failed to load playlist information');
        } finally {
            setIsLoading(false);
        }
    }, [url, getPlaylistInfo]);

    const toggleSelect = (id: string) => {
        setSelectedVideos(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        if (playlistInfo) {
            setSelectedVideos(new Set(playlistInfo.videos.map(v => v.id)));
        }
    };

    const deselectAll = () => {
        setSelectedVideos(new Set());
    };

    const handleDownload = async (format: 'video' | 'audio') => {
        if (!playlistInfo) return;

        setIsDownloading(true);
        const selectedVids = playlistInfo.videos.filter(v => selectedVideos.has(v.id));

        await runWithConcurrency(selectedVids, CONCURRENCY_LIMIT, async (video) => {
            await addDownload(video.url, format, format === 'video' ? quality : undefined);
        });

        setIsDownloading(false);
        onClose();
    };

    if (!isOpen) return null;

    const totalSize = playlistInfo ? calculateTotalSize(playlistInfo.videos, selectedVideos) : 0;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-foreground/10 rounded-2xl shadow-2xl w-full max-w-3xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-foreground/8">
                    <div className="flex items-center gap-2">
                        <ListVideo className="w-5 h-5 text-primary" />
                        <h2 className="text-lg font-semibold">{t('playlistModal.title')}</h2>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-auto">
                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-foreground/50">{t('playlistModal.loading')}</p>
                        </div>
                    )}

                    {error && (
                        <div className="text-center text-foreground/70 py-12">
                            {error}
                        </div>
                    )}

                    {playlistInfo && (
                        <>
                            {/* Playlist Info */}
                            <div className="p-4 border-b border-foreground/8">
                                <div className="flex gap-4">
                                    {playlistInfo.thumbnail && (
                                        <img
                                            src={playlistInfo.thumbnail}
                                            alt={playlistInfo.title}
                                            className="w-32 h-20 object-cover rounded-lg"
                                        />
                                    )}
                                    <div className="flex-1">
                                        <h3 className="font-semibold text-lg">{playlistInfo.title}</h3>
                                        <p className="text-sm text-foreground/50">{playlistInfo.uploader}</p>
                                        <p className="text-sm text-foreground/60 mt-1">
                                            {t('playlistModal.videos', { count: playlistInfo.videoCount })}
                                        </p>
                                    </div>
                                </div>

                                {/* Large playlist warning */}
                                {showWarning && (
                                    <div className="mt-4 p-3 bg-warning/15 border border-warning/30 rounded-lg flex items-start gap-3">
                                        <AlertTriangle className="w-5 h-5 text-foreground/70 flex-shrink-0 mt-0.5" />
                                        <div>
                                            <p className="text-sm text-foreground/80 font-medium">{t('playlistModal.largeWarning', 'Large Playlist Warning')}</p>
                                            <p className="text-xs text-foreground/60 mt-1">
                                                {t('playlistModal.largePlaylistWarn', { count: playlistInfo.videoCount })}
                                            </p>
                                        </div>
                                        <button
                                            onClick={() => setShowWarning(false)}
                                            className="text-foreground/40 hover:text-foreground"
                                        >
                                            <X className="w-4 h-4" />
                                        </button>
                                    </div>
                                )}
                            </div>

                            {/* Quality & Selection Controls */}
                            <div className="p-4 border-b border-foreground/8 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-2">
                                        <label className="text-sm text-foreground/60">Quality:</label>
                                        <select
                                            value={quality}
                                            onChange={(e) => setQuality(e.target.value)}
                                            className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-primary"
                                        >
                                            <option value="best">Best</option>
                                            <option value="2160">4K (2160p)</option>
                                            <option value="1440">QHD (1440p)</option>
                                            <option value="1080">FHD (1080p)</option>
                                            <option value="720">HD (720p)</option>
                                            <option value="480">SD (480p)</option>
                                        </select>
                                    </div>
                                    <span className="text-sm text-foreground/50">
                                        {selectedVideos.size} of {playlistInfo.videos.length} selected
                                    </span>
                                    {totalSize > 0 && (
                                        <span className="text-sm text-foreground/40">
                                            (~{formatFileSize(totalSize)})
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground px-2 py-1 rounded hover:bg-foreground/5"
                                    >
                                        <CheckSquare className="w-3 h-3" />
                                        {t('playlistModal.selectAll')}
                                    </button>
                                    <button
                                        onClick={deselectAll}
                                        className="flex items-center gap-1 text-xs text-foreground/60 hover:text-foreground px-2 py-1 rounded hover:bg-foreground/5"
                                    >
                                        <Square className="w-3 h-3" />
                                        {t('playlistModal.deselectAll')}
                                    </button>
                                </div>
                            </div>

                            {/* Video List */}
                            <div className="p-4 space-y-2 max-h-80 overflow-auto">
                                {playlistInfo.videos.map((video, index) => (
                                    <div
                                        key={video.id}
                                        onClick={() => toggleSelect(video.id)}
                                        className={cn(
                                            "flex items-center gap-3 p-2 rounded-lg cursor-pointer transition-all",
                                            selectedVideos.has(video.id)
                                                ? "bg-primary/12 border border-primary/30"
                                                : "bg-secondary/50 border border-transparent hover:border-foreground/10"
                                        )}
                                    >
                                        {/* Checkbox */}
                                        <div className={cn(
                                            "w-5 h-5 rounded border-2 flex items-center justify-center flex-shrink-0",
                                            selectedVideos.has(video.id)
                                                ? "bg-primary border-primary"
                                                : "border-foreground/30"
                                        )}>
                                            {selectedVideos.has(video.id) && (
                                                <Check className="w-3 h-3 text-primary-foreground" />
                                            )}
                                        </div>

                                        {/* Index */}
                                        <span className="text-xs text-foreground/40 w-6">{index + 1}</span>

                                        {/* Thumbnail */}
                                        <div className="w-16 h-10 bg-secondary/60 rounded overflow-hidden flex-shrink-0">
                                            {video.thumbnail ? (
                                                <img
                                                    src={video.thumbnail}
                                                    alt=""
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <ListVideo className="w-4 h-4 text-foreground/20" />
                                                </div>
                                            )}
                                        </div>

                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="text-sm font-medium truncate">{video.title}</p>
                                            <div className="flex items-center gap-2 text-xs text-foreground/50">
                                                <span className="flex items-center gap-1">
                                                    <Clock className="w-3 h-3" />
                                                    {formatDuration(video.duration)}
                                                </span>
                                                {video.filesize_approx && (
                                                    <span>{formatFileSize(video.filesize_approx)}</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer */}
                {playlistInfo && selectedVideos.size > 0 && (
                    <div className="p-4 border-t border-foreground/8 bg-secondary/30">
                        <div className="flex items-center justify-between">
                            <div>
                                <span className="text-sm text-foreground/60">
                                    {t('playlistModal.readyDownload', { count: selectedVideos.size, defaultValue: 'Ready to download {{count}} video(s)' })}
                                </span>
                                {totalSize > 0 && (
                                    <span className="text-sm text-foreground/40 ml-2">
                                        (~{formatFileSize(totalSize)})
                                    </span>
                                )}
                            </div>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownload('video')}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors disabled:opacity-50"
                                >
                                    {isDownloading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Download className="w-4 h-4" />
                                    )}
                                    {t('playlistModal.downloadVideo')}
                                </button>
                                <button
                                    onClick={() => handleDownload('audio')}
                                    disabled={isDownloading}
                                    className="flex items-center gap-2 px-5 py-2.5 bg-foreground/10 text-foreground border border-foreground/15 rounded-lg font-medium text-sm hover:bg-foreground/15 transition-colors disabled:opacity-50"
                                >
                                    {isDownloading ? (
                                        <Loader2 className="w-4 h-4 animate-spin" />
                                    ) : (
                                        <Music className="w-4 h-4" />
                                    )}
                                    {t('playlistModal.downloadAudio')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PlaylistModal;
