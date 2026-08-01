import React from 'react';
import { Search, Calendar, Download, Trash2, RefreshCw, XCircle, ExternalLink } from 'lucide-react';
import { cn } from '../lib/utils';
import { useDownloads, HistoryItem } from '../context/DownloadContext';
import { useTranslation } from 'react-i18next';

const formatDate = (isoString: string): string => {
    const date = new Date(isoString);
    return date.toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
};

const History: React.FC = () => {
    const { t } = useTranslation();
    const [searchQuery, setSearchQuery] = React.useState('');
    const { history, removeFromHistory, clearHistory, addDownload, settings } = useDownloads();

    const filteredHistory = history.filter(item =>
        item.title.toLowerCase().includes(searchQuery.toLowerCase())
    );

    const handleRedownload = async (item: HistoryItem) => {
        await addDownload(item.url, item.format, item.quality);
    };

    if (!settings.historyEnabled) {
        return (
            <div className="page-shell gap-6">
                <div className="surface-card p-6 lg:p-7">
                    <p className="section-title mb-2">{t('history.sectionTitle')}</p>
                    <h1 className="text-2xl font-semibold tracking-tight mb-1">{t('history.pageTitle')}</h1>
                    <p className="text-foreground/60">{t('history.description')}</p>
                </div>

                <div className="surface-card flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="p-4 rounded-full bg-secondary/60 border border-foreground/10 mb-4">
                        <XCircle className="w-8 h-8 text-foreground/30" />
                    </div>
                    <h3 className="font-medium text-foreground/70 mb-1">{t('history.historyDisabled')}</h3>
                    <p className="text-sm text-foreground/45 max-w-xs">
                        {t('history.historyDisabledDesc')}
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div className="page-shell gap-6">
            <div className="surface-card p-6 lg:p-7">
                <div className="flex items-center justify-between mb-5">
                    <div>
                        <p className="section-title mb-2">{t('history.sectionTitle')}</p>
                        <h1 className="text-2xl font-semibold tracking-tight mb-1">{t('history.pageTitle')}</h1>
                        <p className="text-foreground/60">
                            {t('history.downloadsSaved', { count: history.length })}
                        </p>
                    </div>

                    {history.length > 0 && (
                        <button
                            onClick={clearHistory}
                            className="btn-danger"
                        >
                            <Trash2 className="w-4 h-4" />
                            {t('history.clearAll')}
                        </button>
                    )}
                </div>

                {/* Search Bar */}
                {history.length > 0 && (
                    <div className="relative max-w-md">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-foreground/40" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            placeholder={t('history.searchPlaceholder')}
                            className="soft-input pl-10 pr-4 py-2.5"
                        />
                    </div>
                )}
            </div>

            {/* History List */}
            {history.length === 0 ? (
                <div className="surface-card flex-1 flex flex-col items-center justify-center text-center p-8">
                    <div className="p-4 rounded-full bg-secondary/60 border border-foreground/10 mb-4">
                        <Calendar className="w-8 h-8 text-foreground/30" />
                    </div>
                    <h3 className="font-medium text-foreground/70 mb-1">{t('history.noHistory')}</h3>
                    <p className="text-sm text-foreground/45 max-w-xs">
                        {t('history.noHistoryDesc')}
                    </p>
                </div>
            ) : filteredHistory.length === 0 && searchQuery ? (
                <div className="surface-card flex-1 flex flex-col items-center justify-center text-center p-8">
                    <p className="text-sm text-foreground/50">{t('history.noResults', { query: searchQuery })}</p>
                </div>
            ) : (
                <div className="surface-card flex-1 overflow-auto p-4 space-y-3">
                    {filteredHistory.map((item) => (
                        <div
                            key={item.id}
                            className="group list-card flex items-center gap-4"
                        >
                            {/* Thumbnail */}
                            <a
                                href={item.url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="w-16 h-12 rounded-lg overflow-hidden bg-secondary/70 border border-foreground/10 flex-shrink-0 hover:border-foreground/35 transition-colors"
                                title={t('history.openSource')}
                            >
                                {item.thumbnail ? (
                                    <img src={item.thumbnail} alt={item.title} className="w-full h-full object-cover" />
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center">
                                        <Download className="w-6 h-6 text-foreground/30" />
                                    </div>
                                )}
                            </a>

                            {/* Info */}
                            <div className="flex-1 min-w-0">
                                <a
                                    href={item.url}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex max-w-full items-center gap-1.5 text-sm font-medium hover:underline underline-offset-4"
                                    title={t('history.openSource')}
                                >
                                    <span className="truncate">{item.title}</span>
                                    <ExternalLink className="w-3 h-3 flex-shrink-0 text-foreground/45" />
                                </a>
                                <div className="flex items-center gap-2 mt-1 text-xs text-foreground/50">
                                    <span className={cn(
                                        "px-1.5 py-0.5 rounded",
                                        item.format === 'audio' ? "bg-foreground/10 text-foreground/70" :
                                            item.format === 'photo' ? "bg-foreground/15 text-foreground/80" :
                                                "bg-foreground/20 text-foreground"
                                    )}>
                                        {item.format === 'audio' ? 'MP3' : item.format === 'photo' ? t('history.photo') : item.quality ? `${item.quality}p` : t('history.video')}
                                    </span>
                                    <span>•</span>
                                    <span>{formatDate(item.completedAt)}</span>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                                <button
                                    onClick={() => handleRedownload(item)}
                                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                                    title={t('history.downloadAgain')}
                                >
                                    <RefreshCw className="w-4 h-4" />
                                </button>
                                <button
                                    onClick={() => removeFromHistory(item.id)}
                                    className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
                                    title={t('history.removeFromHistory')}
                                >
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default History;
