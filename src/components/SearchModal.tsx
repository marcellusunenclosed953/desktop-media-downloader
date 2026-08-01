import React, { useState, useCallback } from 'react';
import { X, Search, Youtube, Loader2, Download, Music, Eye } from 'lucide-react';
import { useDownloads } from '../context/DownloadContext';
import { cn, runWithConcurrency } from '../lib/utils';
import { useTranslation } from 'react-i18next';

interface SearchResult {
    id: string;
    title: string;
    thumbnail?: string;
    duration?: number;
    uploader?: string;
    view_count?: number;
    url: string;
    filesize_approx?: number;
    platform: string;
}

interface SearchModalProps {
    isOpen: boolean;
    onClose: () => void;
}

// Only YouTube search is supported by yt-dlp
// TikTok/Instagram require direct URLs
const platforms = [
    { id: 'youtube', name: 'YouTube', icon: Youtube },
];

const formatDuration = (seconds?: number): string => {
    if (!seconds) return '--:--';
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
};

const formatViews = (views?: number): string => {
    if (!views) return '';
    if (views >= 1000000) return `${(views / 1000000).toFixed(1)}M views`;
    if (views >= 1000) return `${(views / 1000).toFixed(1)}K views`;
    return `${views} views`;
};

const formatFileSize = (bytes?: number): string => {
    if (!bytes) return '';
    if (bytes >= 1073741824) return `${(bytes / 1073741824).toFixed(1)} GB`;
    if (bytes >= 1048576) return `${(bytes / 1048576).toFixed(1)} MB`;
    if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${bytes} B`;
};

const SearchModal: React.FC<SearchModalProps> = ({ isOpen, onClose }) => {
    const { t } = useTranslation();
    const { searchVideos, addDownload, settings } = useDownloads();
    const [query, setQuery] = useState('');
    const [platform, setPlatform] = useState('youtube');
    const [results, setResults] = useState<SearchResult[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [selectedVideos, setSelectedVideos] = useState<Set<string>>(new Set());

    const handleSearch = useCallback(async () => {
        if (!query.trim()) return;

        setIsLoading(true);
        setError(null);
        setResults([]);
        setSelectedVideos(new Set());

        try {
            const response = await searchVideos(query, platform, 20);
            if (response.success && response.data?.results) {
                setResults(response.data.results);
            } else {
                setError(response.error || 'Search failed');
            }
        } catch (e) {
            setError('Failed to search videos');
        } finally {
            setIsLoading(false);
        }
    }, [query, platform, searchVideos]);

    const handleKeyPress = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            handleSearch();
        }
    };

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
        setSelectedVideos(new Set(results.map(r => r.id)));
    };

    const deselectAll = () => {
        setSelectedVideos(new Set());
    };

    const handleDownloadSingle = async (result: SearchResult, format: 'video' | 'audio') => {
        await addDownload(result.url, format, format === 'video' ? settings.defaultQuality : undefined);
    };

    const handleDownloadSelected = async (format: 'video' | 'audio') => {
        const selectedResults = results.filter(r => selectedVideos.has(r.id));
        await runWithConcurrency(selectedResults, 4, async (result) => {
            await addDownload(result.url, format, format === 'video' ? settings.defaultQuality : undefined);
        });
        setSelectedVideos(new Set());
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
            <div className="bg-card border border-foreground/10 rounded-2xl shadow-2xl w-full max-w-4xl max-h-[85vh] flex flex-col overflow-hidden">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-foreground/8">
                    <div className="flex items-center gap-2">
                        <Search className="w-5 h-5 text-primary" />
                        <div>
                            <h2 className="text-lg font-semibold">{t('searchModal.title')}</h2>
                            <p className="text-xs text-foreground/40">{t('searchModal.directUrlHint', 'For TikTok/Instagram, paste direct URLs on home page')}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                    >
                        <X className="w-5 h-5" />
                    </button>
                </div>

                {/* Platform Tabs */}
                <div className="flex gap-2 p-4 border-b border-foreground/8">
                    {platforms.map((p) => {
                        const Icon = p.icon;
                        return (
                            <button
                                key={p.id}
                                onClick={() => setPlatform(p.id)}
                                className={cn(
                                    "flex items-center gap-2 px-4 py-2 rounded-lg font-medium text-sm transition-all",
                                    platform === p.id
                                        ? "bg-primary text-primary-foreground"
                                        : "bg-secondary hover:bg-secondary/80 text-foreground/70"
                                )}
                            >
                                <Icon className="w-4 h-4" />
                                {p.name}
                            </button>
                        );
                    })}
                </div>

                {/* Search Input */}
                <div className="p-4 border-b border-foreground/8">
                    <div className="flex gap-2">
                        <div className="flex-1 relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                            <input
                                type="text"
                                value={query}
                                onChange={(e) => setQuery(e.target.value)}
                                onKeyPress={handleKeyPress}
                                placeholder={t('searchModal.placeholder')}
                                className="w-full pl-10 pr-4 py-3 bg-secondary/50 border border-foreground/10 rounded-xl text-foreground placeholder:text-foreground/30 focus:outline-none focus:border-primary/50 focus:ring-1 focus:ring-primary/50"
                            />
                        </div>
                        <button
                            onClick={handleSearch}
                            disabled={!query.trim() || isLoading}
                            className={cn(
                                "px-6 py-3 rounded-xl font-medium transition-all flex items-center gap-2",
                                query.trim() && !isLoading
                                    ? "bg-primary hover:bg-primary/90 text-primary-foreground"
                                    : "bg-secondary text-foreground/30 cursor-not-allowed"
                            )}
                        >
                            {isLoading ? (
                                <Loader2 className="w-4 h-4 animate-spin" />
                            ) : (
                                <Search className="w-4 h-4" />
                            )}
                            {t('searchModal.searchBtn', 'Search')}
                        </button>
                    </div>
                </div>

                {/* Results */}
                <div className="flex-1 overflow-auto p-4">
                    {error && (
                        <div className="text-center text-foreground/70 py-8">
                            {error}
                        </div>
                    )}

                    {isLoading && (
                        <div className="flex flex-col items-center justify-center py-12 gap-3">
                            <Loader2 className="w-8 h-8 animate-spin text-primary" />
                            <p className="text-foreground/50">{t('searchModal.searching')}</p>
                        </div>
                    )}

                    {!isLoading && !error && results.length === 0 && query && (
                        <div className="text-center text-foreground/50 py-12">
                            {t('searchModal.noResults')} {t('searchModal.tryDifferent')}
                        </div>
                    )}

                    {!isLoading && results.length > 0 && (
                        <>
                            {/* Selection Controls */}
                            <div className="flex items-center justify-between mb-4">
                                <div className="flex items-center gap-2">
                                    <span className="text-sm text-foreground/60">
                                        {results.length} results
                                    </span>
                                    {selectedVideos.size > 0 && (
                                        <span className="text-sm text-primary">
                                            ({selectedVideos.size} selected)
                                        </span>
                                    )}
                                </div>
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={selectAll}
                                        className="text-xs text-foreground/60 hover:text-foreground"
                                    >
                                        {t('searchModal.selectAll')}
                                    </button>
                                    <span className="text-foreground/30">|</span>
                                    <button
                                        onClick={deselectAll}
                                        className="text-xs text-foreground/60 hover:text-foreground"
                                    >
                                        {t('searchModal.deselectAll')}
                                    </button>
                                </div>
                            </div>

                            {/* Results Grid */}
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                                {results.map((result) => (
                                    <div
                                        key={result.id}
                                        className={cn(
                                            "group relative bg-secondary/40 rounded-xl overflow-hidden border transition-all cursor-pointer",
                                            selectedVideos.has(result.id)
                                                ? "border-primary ring-1 ring-primary/60"
                                                : "border-foreground/8 hover:border-foreground/15"
                                        )}
                                        onClick={() => toggleSelect(result.id)}
                                    >
                                        {/* Thumbnail */}
                                        <div className="aspect-video bg-black/50 relative">
                                            {result.thumbnail ? (
                                                <img
                                                    src={result.thumbnail}
                                                    alt={result.title}
                                                    className="w-full h-full object-cover"
                                                />
                                            ) : (
                                                <div className="w-full h-full flex items-center justify-center">
                                                    <Youtube className="w-8 h-8 text-foreground/20" />
                                                </div>
                                            )}
                                            {/* Duration badge */}
                                            <div className="absolute bottom-1 right-1 bg-background/80 px-1.5 py-0.5 rounded text-xs">
                                                {formatDuration(result.duration)}
                                            </div>
                                            {/* Selection checkbox */}
                                            <div className={cn(
                                                "absolute top-2 left-2 w-5 h-5 rounded border-2 transition-all flex items-center justify-center",
                                                selectedVideos.has(result.id)
                                                    ? "bg-primary border-primary"
                                                    : "border-foreground/40 group-hover:border-foreground/60"
                                            )}>
                                                {selectedVideos.has(result.id) && (
                                                    <svg className="w-3 h-3 text-primary-foreground" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                                                    </svg>
                                                )}
                                            </div>
                                        </div>

                                        {/* Info */}
                                        <div className="p-3">
                                            <h3 className="text-sm font-medium line-clamp-2 mb-1">
                                                {result.title}
                                            </h3>
                                            <p className="text-xs text-foreground/50 mb-2">
                                                {result.uploader}
                                            </p>
                                            <div className="flex items-center gap-2 text-xs text-foreground/40">
                                                {result.view_count && (
                                                    <span className="flex items-center gap-1">
                                                        <Eye className="w-3 h-3" />
                                                        {formatViews(result.view_count)}
                                                    </span>
                                                )}
                                                {result.filesize_approx && (
                                                    <span>{formatFileSize(result.filesize_approx)}</span>
                                                )}
                                            </div>

                                            {/* Quick download buttons */}
                                            <div className="flex gap-1 mt-2" onClick={(e) => e.stopPropagation()}>
                                                <button
                                                    onClick={() => handleDownloadSingle(result, 'video')}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-primary/20 text-primary text-xs rounded-lg hover:bg-primary/30 transition-colors"
                                                >
                                                    <Download className="w-3 h-3" />
                                                    {t('searchModal.downloadVideo')}
                                                </button>
                                                <button
                                                    onClick={() => handleDownloadSingle(result, 'audio')}
                                                    className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-foreground/10 text-foreground/75 text-xs rounded-lg hover:bg-foreground/15 transition-colors"
                                                >
                                                    <Music className="w-3 h-3" />
                                                    {t('searchModal.downloadAudio')}
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* Footer with batch download */}
                {selectedVideos.size > 0 && (
                    <div className="p-4 border-t border-foreground/5 bg-secondary/30">
                        <div className="flex items-center justify-between">
                            <span className="text-sm text-foreground/60">
                                {t('searchModal.selected', { count: selectedVideos.size })}
                            </span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleDownloadSelected('video')}
                                    className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg font-medium text-sm hover:bg-primary/90 transition-colors"
                                >
                                    <Download className="w-4 h-4" />
                                    {t('searchModal.downloadSelected')}
                                </button>
                                <button
                                    onClick={() => handleDownloadSelected('audio')}
                                    className="flex items-center gap-2 px-4 py-2 bg-foreground/10 text-foreground border border-foreground/15 rounded-lg font-medium text-sm hover:bg-foreground/15 transition-colors"
                                >
                                    <Music className="w-4 h-4" />
                                    {t('searchModal.downloadAudioBtn', 'Download Audio')}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default SearchModal;
