import React from 'react';
import { Video, Music, Check, X, FolderOpen, Loader2 } from 'lucide-react';
import { cn } from '../lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { useTranslation } from 'react-i18next';

interface FormatSelectorProps {
    isOpen: boolean;
    onClose: () => void;
    onSelect: (
        format: 'video' | 'audio' | 'photo',
        quality?: string,
        outputDir?: string,
        turboOverride?: { enabled: boolean; adaptive?: boolean; connections?: number },
        photoTimestampMode?: 'screenshot' | 'thumbnail'
    ) => void;
    availableQualities?: number[];
    qualitySizes?: Record<string, number>;
    isLoadingQualities?: boolean;
    defaultQuality?: string;
    defaultTurboEnabled?: boolean;
    defaultAdaptiveTurbo?: boolean;
    defaultTurboConnections?: number;
    hasTimestampInUrl?: boolean;
}

// Get quality label based on resolution
const getQualityLabel = (height: number): { label: string; sublabel: string } => {
    if (height >= 2160) return { label: 'UHD', sublabel: `${height}p` };
    if (height >= 1440) return { label: '2K', sublabel: `${height}p` };
    if (height >= 1080) return { label: 'FHD', sublabel: `${height}p` };
    if (height >= 720) return { label: 'HD', sublabel: `${height}p` };
    if (height >= 480) return { label: 'SD', sublabel: `${height}p` };
    return { label: 'Low', sublabel: `${height}p` };
};

const isMobileFriendlyQuality = (height: number): boolean => height <= 1080;

const FormatSelector: React.FC<FormatSelectorProps> = ({
    isOpen,
    onClose,
    onSelect,
    availableQualities = [],
    qualitySizes = {},
    isLoadingQualities = false,
    defaultQuality = 'best',
    defaultTurboEnabled = true,
    defaultAdaptiveTurbo = true,
    defaultTurboConnections = 8,
    hasTimestampInUrl = false,
}) => {
    const { t } = useTranslation();
    const [selectedFormat, setSelectedFormat] = React.useState<'video' | 'audio' | 'photo'>('video');
    const [selectedQuality, setSelectedQuality] = React.useState<string>('');
    const [customOutputDir, setCustomOutputDir] = React.useState<string>('');
    const [isSelectingFolder, setIsSelectingFolder] = React.useState(false);
    const [turboEnabled, setTurboEnabled] = React.useState<boolean>(defaultTurboEnabled);
    const [adaptiveTurbo, setAdaptiveTurbo] = React.useState<boolean>(defaultAdaptiveTurbo);
    const [turboConnections, setTurboConnections] = React.useState<number>(defaultTurboConnections);
    const [photoTimestampMode, setPhotoTimestampMode] = React.useState<'screenshot' | 'thumbnail'>('screenshot');

    // Keep quality array stable across rerenders so selection does not reset while user clicks.
    const sortedQualities = React.useMemo(() => [...availableQualities].sort((a, b) => b - a), [availableQualities]);

    // Set default selected quality from settings when possible, else fallback to highest.
    React.useEffect(() => {
        if (sortedQualities.length > 0 && !selectedQuality) {
            const preferred = Number(defaultQuality);
            if (Number.isFinite(preferred) && sortedQualities.includes(preferred)) {
                setSelectedQuality(String(preferred));
            } else {
                setSelectedQuality(sortedQualities[0].toString());
            }
        }
    }, [sortedQualities, selectedQuality, defaultQuality]);

    // Reset selection when modal opens
    React.useEffect(() => {
        if (isOpen) {
            const preferred = Number(defaultQuality);
            if (sortedQualities.length > 0) {
                if (Number.isFinite(preferred) && sortedQualities.includes(preferred)) {
                    setSelectedQuality(String(preferred));
                } else {
                    setSelectedQuality(sortedQualities[0].toString());
                }
            }
            setSelectedFormat('video');
            setCustomOutputDir('');
            setTurboEnabled(defaultTurboEnabled);
            setAdaptiveTurbo(defaultAdaptiveTurbo);
            setTurboConnections(defaultTurboConnections);
            setPhotoTimestampMode('screenshot');
        }
    }, [isOpen, sortedQualities, defaultQuality, defaultTurboEnabled, defaultAdaptiveTurbo, defaultTurboConnections]);

    const handleConfirm = () => {
        onSelect(
            selectedFormat,
            selectedFormat === 'video' ? selectedQuality : undefined,
            customOutputDir || undefined,
            {
                enabled: turboEnabled,
                adaptive: adaptiveTurbo,
                connections: turboConnections,
            },
            selectedFormat === 'photo' ? photoTimestampMode : undefined
        );
    };

    const handlePickOutputFolder = async () => {
        if (!window.electronAPI?.pickDownloadLocationOnce) return;
        setIsSelectingFolder(true);
        try {
            const result = await window.electronAPI.pickDownloadLocationOnce(customOutputDir || undefined);
            if (result.success && !result.canceled && result.data?.path) {
                setCustomOutputDir(result.data.path);
            }
        } finally {
            setIsSelectingFolder(false);
        }
    };

    // Get label for selected quality
    const selectedQualityInfo = selectedQuality ? getQualityLabel(parseInt(selectedQuality)) : null;

    const formatBytes = (bytes?: number): string => {
        if (!bytes || !Number.isFinite(bytes) || bytes <= 0) return 'Size unknown';
        const units = ['B', 'KB', 'MB', 'GB'];
        let value = bytes;
        let unitIndex = 0;
        while (value >= 1024 && unitIndex < units.length - 1) {
            value /= 1024;
            unitIndex += 1;
        }
        const precision = value >= 100 ? 0 : value >= 10 ? 1 : 2;
        return `~${value.toFixed(precision)} ${units[unitIndex]}`;
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
                    {/* Backdrop */}
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="absolute inset-0 bg-background/80 backdrop-blur-sm"
                        onClick={onClose}
                    />

                    {/* Modal */}
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 10 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        className="relative bg-card border border-foreground/10 rounded-3xl p-6 w-full max-w-md shadow-2xl overflow-hidden max-h-[min(92vh,860px)] flex flex-col"
                    >
                        {/* Decorative background glow */}
                        <div className="absolute -top-20 -right-20 w-40 h-40 bg-primary/20 blur-[80px] rounded-full pointer-events-none" />
                        <div className="absolute -bottom-20 -left-20 w-40 h-40 bg-accent/20 blur-[80px] rounded-full pointer-events-none" />

                        {/* Header */}
                        <div className="flex items-center justify-between mb-6 relative z-10">
                            <div>
                                <h2 className="text-xl font-bold text-foreground">{t('formatSelector.title')}</h2>
                                <p className="text-xs text-foreground/60">{t('formatSelector.selectQuality', 'Select quality options for your download')}</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 rounded-full hover:bg-foreground/10 transition-colors text-foreground/60 hover:text-foreground"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        <div className="relative z-10 flex-1 min-h-0 overflow-y-auto pr-1">
                            {/* Format Type Toggle */}
                            <div className="flex gap-3 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setSelectedFormat('video')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border transition-all duration-200 relative overflow-hidden group",
                                        selectedFormat === 'video'
                                            ? "bg-primary/12 border-primary text-primary"
                                            : "bg-secondary/40 border-transparent text-foreground/60 hover:bg-secondary/60"
                                    )}
                                >
                                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 to-transparent")} />
                                    <Video className="w-5 h-5" />
                                    <span className="font-semibold">{t('formatSelector.video')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFormat('audio')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border transition-all duration-200 relative overflow-hidden group",
                                        selectedFormat === 'audio'
                                            ? "bg-accent/12 border-accent text-foreground"
                                            : "bg-secondary/40 border-transparent text-foreground/60 hover:bg-secondary/60"
                                    )}
                                >
                                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 to-transparent")} />
                                    <Music className="w-5 h-5" />
                                    <span className="font-semibold">{t('formatSelector.audio')}</span>
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setSelectedFormat('photo')}
                                    className={cn(
                                        "flex-1 flex items-center justify-center gap-3 py-4 rounded-xl border transition-all duration-200 relative overflow-hidden group",
                                        selectedFormat === 'photo'
                                            ? "bg-warning/15 border-warning text-foreground"
                                            : "bg-secondary/40 border-transparent text-foreground/60 hover:bg-secondary/60"
                                    )}
                                >
                                    <div className={cn("absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity bg-gradient-to-br from-white/5 to-transparent")} />
                                    <div className="relative">
                                        <Video className="w-5 h-5 absolute rotate-90 scale-75 opacity-0" /> {/* Hack for icon alignment if needed, but using Camera/Image icon is better if available, falling back to text for now or re-using Video icon with modifications if lucide-react doesn't have Image imported. Let's check imports. */}
                                        <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-image"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                    </div>
                                    <span className="font-semibold">{t('formatSelector.photo')}</span>
                                </button>
                            </div>

                            <div className="mb-4 rounded-xl border border-foreground/10 bg-secondary/35 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">{t('formatSelector.outputFolder')}</p>
                                        <p className="text-xs text-foreground/55 truncate">
                                            {customOutputDir || t('formatSelector.defaultFolder')}
                                        </p>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        {customOutputDir && (
                                            <button
                                                type="button"
                                                onClick={() => setCustomOutputDir('')}
                                                className="px-2 py-1 text-[11px] rounded-md bg-foreground/10 hover:bg-foreground/15 text-foreground/70"
                                            >
                                                {t('formatSelector.defaultBtn', 'Default')}
                                            </button>
                                        )}
                                        <button
                                            type="button"
                                            onClick={handlePickOutputFolder}
                                            disabled={isSelectingFolder}
                                            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-md bg-primary/15 hover:bg-primary/25 text-primary text-xs disabled:opacity-60"
                                        >
                                            <FolderOpen className="w-3.5 h-3.5" />
                                            {isSelectingFolder ? t('formatSelector.choosing', 'Choosing...') : t('formatSelector.change')}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            <div className="mb-4 rounded-xl border border-foreground/10 bg-secondary/35 p-3">
                                <div className="flex items-center justify-between gap-3">
                                    <div className="min-w-0">
                                        <p className="text-xs font-semibold uppercase tracking-wider text-foreground/60">{t('formatSelector.turboDownload')}</p>
                                        <p className="text-xs text-foreground/55">
                                            {t('formatSelector.turboOverride', 'Override global turbo settings only for this item.')}
                                        </p>
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => setTurboEnabled(v => !v)}
                                        className={cn(
                                            'px-2.5 py-1.5 rounded-md text-xs font-semibold border transition-colors',
                                            turboEnabled
                                                ? 'bg-primary/15 border-primary/35 text-primary'
                                                : 'bg-foreground/5 border-foreground/15 text-foreground/60'
                                        )}
                                    >
                                        {turboEnabled ? 'On' : 'Off'}
                                    </button>
                                </div>

                                {turboEnabled && (
                                    <div className="mt-3 grid grid-cols-2 gap-2">
                                        <select
                                            value={adaptiveTurbo ? 'auto' : 'manual'}
                                            onChange={(e) => setAdaptiveTurbo(e.target.value === 'auto')}
                                            className="px-2.5 py-1.5 rounded-md bg-secondary border border-foreground/10 text-xs focus:outline-none focus:border-foreground/35"
                                        >
                                            <option value="auto">{t('formatSelector.adaptive')}</option>
                                            <option value="manual">{t('formatSelector.manualMode', 'Manual')}</option>
                                        </select>

                                        <select
                                            value={String(turboConnections)}
                                            onChange={(e) => setTurboConnections(parseInt(e.target.value, 10) || 8)}
                                            disabled={adaptiveTurbo}
                                            className="px-2.5 py-1.5 rounded-md bg-secondary border border-foreground/10 text-xs focus:outline-none focus:border-foreground/35 disabled:opacity-60"
                                        >
                                            <option value="4">4 {t('formatSelector.connections')}</option>
                                            <option value="8">8 {t('formatSelector.connections')}</option>
                                            <option value="12">12 {t('formatSelector.connections')}</option>
                                            <option value="16">16 {t('formatSelector.connections')}</option>
                                        </select>
                                    </div>
                                )}
                            </div>

                            {/* Quality Selection (Video only) */}
                            <div className="min-h-[140px]">
                                <AnimatePresence mode="wait">
                                    {selectedFormat === 'video' ? (
                                        <motion.div
                                            key="video-options"
                                            initial={{ opacity: 0, x: -10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: 10 }}
                                            transition={{ duration: 0.2 }}
                                            className="mb-6"
                                        >
                                            <label className="block text-xs font-semibold uppercase tracking-wider text-foreground/60 mb-3">
                                                {t('formatSelector.quality')}
                                            </label>
                                            <p className="text-[11px] text-foreground/55 mb-3">
                                                {t('formatSelector.mobileBadge', 'Badge:')} <span className="font-semibold text-success">{t('formatSelector.mobile')}</span> {t('formatSelector.mobileMeaning', 'means smoother playback on most phones.')}
                                            </p>
                                            {sortedQualities.length === 0 && isLoadingQualities ? (
                                                <div className="text-sm text-foreground/50 flex items-center justify-center gap-2 py-8 bg-secondary/40 rounded-xl border border-foreground/10 border-dashed">
                                                    <Loader2 className="w-4 h-4 animate-spin" />
                                                    {t('urlPreview.fetchingInfo')}
                                                </div>
                                            ) : sortedQualities.length === 0 ? (
                                                <div className="text-sm text-foreground/50 text-center py-6 bg-secondary/40 rounded-xl border border-foreground/10 border-dashed">
                                                    {t('formatSelector.noQualities', 'No explicit quality options found.')}<br />{t('formatSelector.bestAuto', 'Best quality will be selected automatically.')}
                                                </div>
                                            ) : (
                                                <div className="grid grid-cols-3 gap-2">
                                                    {sortedQualities.map((quality) => {
                                                        const { label, sublabel } = getQualityLabel(quality);
                                                        return (
                                                            <button
                                                                type="button"
                                                                key={quality}
                                                                onClick={() => setSelectedQuality(quality.toString())}
                                                                className={cn(
                                                                    "flex flex-col items-center py-2.5 rounded-xl border transition-all duration-150",
                                                                    selectedQuality === quality.toString()
                                                                        ? "bg-primary text-primary-foreground border-primary shadow-sm"
                                                                        : "bg-secondary/50 border-transparent hover:bg-secondary/70 text-foreground/70"
                                                                )}
                                                            >
                                                                <span className="font-bold text-sm">{label}</span>
                                                                <span className={cn("text-[10px]", selectedQuality === quality.toString() ? "text-primary-foreground/70" : "text-foreground/50")}>{sublabel}</span>
                                                                <span className={cn("text-[10px]", selectedQuality === quality.toString() ? "text-primary-foreground/85" : "text-foreground/45")}>{formatBytes(qualitySizes[quality.toString()])}</span>
                                                                {isMobileFriendlyQuality(quality) && (
                                                                    <span
                                                                        className={cn(
                                                                            "mt-1 px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase tracking-wide",
                                                                            selectedQuality === quality.toString()
                                                                                ? "bg-primary-foreground/25 text-primary-foreground"
                                                                                : "bg-success/20 text-success"
                                                                        )}
                                                                    >
                                                                        {t('formatSelector.mobile')}
                                                                    </span>
                                                                )}
                                                            </button>
                                                        );
                                                    })}
                                                </div>
                                            )}
                                        </motion.div>
                                    ) : selectedFormat === 'audio' ? (
                                        <motion.div
                                            key="audio-info"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="mb-6 p-5 bg-accent/10 rounded-2xl border border-accent/20 flex flex-col items-center text-center gap-3"
                                        >
                                            <div className="p-3 bg-accent/20 rounded-full">
                                                <Music className="w-6 h-6 text-foreground" />
                                            </div>
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">{t('formatSelector.audioTitle', 'High Quality Video to MP3')}</h3>
                                                <p className="text-xs text-foreground/60">
                                                    {t('formatSelector.audioDesc', "We'll extract the audio stream with the highest available bitrate.")}
                                                </p>
                                            </div>
                                        </motion.div>
                                    ) : (
                                        <motion.div
                                            key="photo-info"
                                            initial={{ opacity: 0, x: 10 }}
                                            animate={{ opacity: 1, x: 0 }}
                                            exit={{ opacity: 0, x: -10 }}
                                            transition={{ duration: 0.2 }}
                                            className="mb-6 p-5 bg-warning/10 rounded-2xl border border-warning/20 flex flex-col items-center text-center gap-3"
                                        >
                                            <div className="p-3 bg-warning/20 rounded-full">
                                                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-foreground"><rect width="18" height="18" x="3" y="3" rx="2" ry="2" /><circle cx="9" cy="9" r="2" /><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21" /></svg>
                                            </div>
                                            <div>
                                                <h3 className="text-foreground font-medium mb-1">{t('formatSelector.photoTitle', 'High Quality Photo')}</h3>
                                                <p className="text-xs text-foreground/60">
                                                    {t('formatSelector.photoDesc', 'Download the best thumbnail, or capture a screenshot when the URL includes a time.')}
                                                </p>
                                            </div>

                                            {hasTimestampInUrl && (
                                                <div className="w-full mt-2 rounded-xl border border-warning/25 bg-warning/5 p-3">
                                                    <p className="text-[11px] uppercase tracking-wide text-foreground/60 mb-2">{t('formatSelector.timestampDetected', 'Timestamp Link Detected')}</p>
                                                    <div className="grid grid-cols-2 gap-2">
                                                        <button
                                                            type="button"
                                                            onClick={() => setPhotoTimestampMode('screenshot')}
                                                            className={cn(
                                                                'px-2.5 py-2 rounded-lg text-xs border transition-colors',
                                                                photoTimestampMode === 'screenshot'
                                                                    ? 'bg-warning/25 border-warning text-foreground'
                                                                    : 'bg-secondary/40 border-foreground/10 text-foreground/65 hover:bg-secondary/60'
                                                            )}
                                                        >
                                                            {t('formatSelector.screenshot')}
                                                        </button>
                                                        <button
                                                            type="button"
                                                            onClick={() => setPhotoTimestampMode('thumbnail')}
                                                            className={cn(
                                                                'px-2.5 py-2 rounded-lg text-xs border transition-colors',
                                                                photoTimestampMode === 'thumbnail'
                                                                    ? 'bg-warning/25 border-warning text-foreground'
                                                                    : 'bg-secondary/40 border-foreground/10 text-foreground/65 hover:bg-secondary/60'
                                                            )}
                                                        >
                                                            {t('formatSelector.thumbnailOnly')}
                                                        </button>
                                                    </div>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        </div>

                        {/* Confirm Button */}
                        <button
                            onClick={handleConfirm}
                            className={cn(
                                "relative z-10 w-full py-3.5 mt-4 rounded-xl font-bold transition-all flex items-center justify-center gap-2 transform active:scale-98 shadow-md shrink-0",
                                selectedFormat === 'audio'
                                    ? "bg-accent hover:bg-accent/90 text-primary-foreground"
                                    : selectedFormat === 'photo'
                                        ? "bg-warning hover:bg-warning/90 text-primary-foreground"
                                        : "bg-primary hover:bg-primary/90 text-primary-foreground"
                            )}
                        >
                            <Check className="w-5 h-5" />
                            <span>
                                {t('formatSelector.confirm')} {selectedFormat === 'audio'
                                    ? t('formatSelector.audio')
                                    : selectedFormat === 'photo'
                                        ? (hasTimestampInUrl && photoTimestampMode === 'screenshot' ? t('formatSelector.screenshot') : t('formatSelector.photo'))
                                        : selectedQualityInfo
                                            ? `${selectedQualityInfo.label} (${selectedQualityInfo.sublabel})`
                                            : t('formatSelector.video')
                                }
                            </span>
                        </button>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    );
};

export default FormatSelector;
