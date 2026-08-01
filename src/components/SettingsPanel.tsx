import React, { useState, useEffect } from 'react';
import { Moon, Sun, Folder, Download, History, Subtitles, Music2, Tag, Globe, Loader2, CheckCircle, XCircle, Languages } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useDownloads } from '../context/DownloadContext';
import { cn } from '../lib/utils';
import { useTranslation } from 'react-i18next';
import { SUPPORTED_LANGUAGES } from '../i18n/i18n';

// Window types are defined in vite-env.d.ts

interface SettingsRowProps {
    icon: React.ReactNode;
    title: string;
    description: string;
    beta?: boolean;
    betaNote?: string;
    children: React.ReactNode;
}

const SettingsRow: React.FC<SettingsRowProps> = ({ icon, title, description, beta = false, betaNote, children }) => (
    <div className="flex items-center justify-between py-4 border-b border-foreground/5 last:border-0">
        <div className="flex items-start gap-3">
            <div className="p-2 rounded-lg bg-foreground/5 text-foreground/60">
                {icon}
            </div>
            <div>
                <div className="flex items-center gap-2">
                    <h4 className="font-medium text-sm">{title}</h4>
                    {beta && (
                        <span className="px-1.5 py-0.5 rounded bg-warning/20 text-warning text-[10px] font-semibold uppercase tracking-wide">
                            Beta
                        </span>
                    )}
                </div>
                <p className="text-xs text-foreground/50 mt-0.5">{description}</p>
                {beta && betaNote && (
                    <p className="text-[11px] text-warning/80 mt-1">{betaNote}</p>
                )}
            </div>
        </div>
        <div>{children}</div>
    </div>
);

interface ToggleProps {
    enabled: boolean;
    onToggle: () => void;
}

const Toggle: React.FC<ToggleProps> = ({ enabled, onToggle }) => (
    <button
        onClick={onToggle}
        className={cn(
            "w-11 h-6 rounded-full transition-colors relative",
            enabled ? "bg-primary" : "bg-secondary"
        )}
    >
        <div
            className={cn(
                "absolute top-1 w-4 h-4 rounded-full bg-primary-foreground transition-all",
                enabled ? "left-6" : "left-1"
            )}
        />
    </button>
);

const LANGUAGES = [
    { code: 'en', name: 'English' },
    { code: 'tr', name: 'Turkish' },
    { code: 'auto', name: 'Auto-detect' },
    { code: 'original', name: 'Original' },
    { code: 'es', name: 'Spanish' },
    { code: 'fr', name: 'French' },
    { code: 'de', name: 'German' },
    { code: 'ja', name: 'Japanese' },
    { code: 'ko', name: 'Korean' },
    { code: 'zh', name: 'Chinese' },
];

const SettingsPanel: React.FC = () => {
    const { t, i18n } = useTranslation();
    const { theme, toggleTheme } = useTheme();
    const { settings, updateSettings, history, clearHistory, getAvailableBrowsers, validateBrowserCookies } = useDownloads();
    const [browsers, setBrowsers] = useState<{ id: string; name: string }[]>([]);
    const [cookieStatus, setCookieStatus] = useState<'idle' | 'checking' | 'valid' | 'invalid' | 'unknown'>('idle');
    const [downloadLocation, setDownloadLocation] = useState<{ path: string; defaultPath: string; isDefault: boolean } | null>(null);

    useEffect(() => {
        loadBrowsers();
        loadDownloadLocation();
    }, []);

    const loadBrowsers = async () => {
        const result = await getAvailableBrowsers();
        if (result.success && result.browsers) {
            setBrowsers(result.browsers);
        }
    };

    const loadDownloadLocation = async () => {
        try {
            if (!window.electronAPI?.getDownloadLocation) return;
            const result = await window.electronAPI.getDownloadLocation();
            if (result.success && result.data) {
                setDownloadLocation(result.data);
            }
        } catch {
            // Keep settings usable when location API is unavailable.
        }
    };

    const handleSelectDownloadLocation = async () => {
        if (!window.electronAPI?.selectDownloadLocation) return;
        const result = await window.electronAPI.selectDownloadLocation();
        if (result.success && result.data) {
            setDownloadLocation(result.data);
        }
    };

    const handleResetDownloadLocation = async () => {
        if (!window.electronAPI?.resetDownloadLocation) return;
        const result = await window.electronAPI.resetDownloadLocation();
        if (result.success && result.data) {
            setDownloadLocation(result.data);
        }
    };

    const handleOpenDownloads = async () => {
        if (window.electronAPI?.openDownloadsFolder) {
            await window.electronAPI.openDownloadsFolder();
        }
    };

    const handleToggleHistory = () => {
        if (settings.historyEnabled) {
            const shouldDisable = window.confirm(t('settings.disableHistoryConfirm'));

            if (!shouldDisable) {
                return;
            }

            updateSettings({ historyEnabled: false });
            clearHistory();
            return;
        }

        updateSettings({ historyEnabled: true });
    };

    const handleDefaultQualityChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateSettings({ defaultQuality: e.target.value });
    };

    const handleToggleTurboDownload = () => {
        updateSettings({ enableTurboDownload: !settings.enableTurboDownload });
    };

    const handleTurboConnectionsChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const parsed = parseInt(e.target.value, 10);
        updateSettings({ turboConnections: Number.isFinite(parsed) ? parsed : 8 });
    };

    const handleToggleSubtitles = () => {
        updateSettings({ embedSubtitles: !settings.embedSubtitles });
    };

    const handleSubtitleLanguagesChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        const options = e.target.options;
        const selected: string[] = [];
        for (let i = 0; i < options.length; i++) {
            if (options[i].selected) {
                selected.push(options[i].value);
            }
        }
        updateSettings({ subtitleLanguages: selected.length > 0 ? selected : ['en'] });
    };

    const handleToggleMetadata = () => {
        updateSettings({ embedMetadata: !settings.embedMetadata });
    };

    const handleToggleThumbnail = () => {
        updateSettings({ preserveThumbnail: !settings.preserveThumbnail });
    };

    const handleToggleAltAudio = () => {
        updateSettings({ embedAltAudio: !settings.embedAltAudio });
    };

    const handleAudioLangChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        updateSettings({ preferredAudioLang: e.target.value });
    };

    const handleBrowserChange = async (e: React.ChangeEvent<HTMLSelectElement>) => {
        const browser = e.target.value;
        updateSettings({ cookiesFromBrowser: browser });

        if (browser) {
            setCookieStatus('checking');
            const result = await validateBrowserCookies(browser);
            if (result.status === 'valid') {
                setCookieStatus('valid');
            } else if (result.status === 'invalid') {
                setCookieStatus('invalid');
            } else {
                setCookieStatus('unknown');
            }
        } else {
            setCookieStatus('idle');
        }
    };

    return (
        <div className="h-full w-full bg-transparent p-8 overflow-auto">
            <div className="max-w-2xl mx-auto">
                <h1 className="text-2xl font-bold mb-2">{t('settings.title')}</h1>
                <p className="text-foreground/60 mb-8">{t('settings.subtitle')}</p>

                {/* Language Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.languageSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Languages className="w-4 h-4" />}
                            title={t('settings.uiLanguage')}
                            description={t('settings.uiLanguageDesc')}
                        >
                            <select
                                value={i18n.language}
                                onChange={(e) => i18n.changeLanguage(e.target.value)}
                                className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35"
                            >
                                {SUPPORTED_LANGUAGES.map(lang => (
                                    <option key={lang.code} value={lang.code}>{lang.flag} {lang.name}</option>
                                ))}
                            </select>
                        </SettingsRow>
                    </div>
                </div>

                {/* Appearance Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.appearanceSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={theme === 'dark' ? <Moon className="w-4 h-4" /> : <Sun className="w-4 h-4" />}
                            title={t('settings.darkMode')}
                            description={t('settings.darkModeDesc')}
                        >
                            <Toggle enabled={theme === 'dark'} onToggle={toggleTheme} />
                        </SettingsRow>
                    </div>
                </div>

                {/* Downloads Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.downloadsSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Folder className="w-4 h-4" />}
                            title={t('settings.downloadLocation')}
                            description={downloadLocation
                                ? t('settings.preferredFolder', { path: downloadLocation.path })
                                : t('settings.chooseFolderDesc')}
                        >
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={handleSelectDownloadLocation}
                                    className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors"
                                >
                                    {t('settings.change')}
                                </button>
                                {!downloadLocation?.isDefault && (
                                    <button
                                        onClick={handleResetDownloadLocation}
                                        className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors"
                                    >
                                        {t('settings.reset')}
                                    </button>
                                )}
                                <button
                                    onClick={handleOpenDownloads}
                                    className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors"
                                >
                                    {t('settings.open')}
                                </button>
                            </div>
                        </SettingsRow>

                        <SettingsRow
                            icon={<Download className="w-4 h-4" />}
                            title={t('settings.defaultQuality')}
                            description={t('settings.defaultQualityDesc')}
                        >
                            <select
                                value={settings.defaultQuality}
                                onChange={handleDefaultQualityChange}
                                className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35"
                            >
                                <option value="best">{t('settings.bestAvailable')}</option>
                                <option value="2160">4K (2160p)</option>
                                <option value="1440">QHD (1440p)</option>
                                <option value="1080">FHD (1080p)</option>
                                <option value="720">HD (720p)</option>
                                <option value="480">SD (480p)</option>
                            </select>
                        </SettingsRow>

                        <SettingsRow
                            icon={<Download className="w-4 h-4" />}
                            title={t('settings.turboDownload')}
                            description={t('settings.turboDownloadDesc')}
                            beta
                            betaNote={t('settings.turboDownloadNote')}
                        >
                            <Toggle enabled={settings.enableTurboDownload} onToggle={handleToggleTurboDownload} />
                        </SettingsRow>

                        {settings.enableTurboDownload && (
                            <>
                                <SettingsRow
                                    icon={<Download className="w-4 h-4" />}
                                    title={t('settings.turboMode')}
                                    description={t('settings.turboModeDesc')}
                                >
                                    <select
                                        value={settings.adaptiveTurboDownload ? 'auto' : 'manual'}
                                        onChange={(e) => updateSettings({ adaptiveTurboDownload: e.target.value === 'auto' })}
                                        className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35"
                                    >
                                        <option value="auto">{t('settings.autoRecommended')}</option>
                                        <option value="manual">{t('settings.manual')}</option>
                                    </select>
                                </SettingsRow>

                                <div className="px-1 pb-3 text-xs text-foreground/55 leading-relaxed">
                                    {t('settings.turboAutoExplanation')}
                                </div>
                            </>
                        )}

                        {settings.enableTurboDownload && !settings.adaptiveTurboDownload && (
                            <SettingsRow
                                icon={<Download className="w-4 h-4" />}
                                title={t('settings.turboConnections')}
                                description={t('settings.turboConnectionsDesc')}
                            >
                                <select
                                    value={String(settings.turboConnections)}
                                    onChange={handleTurboConnectionsChange}
                                    className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35"
                                >
                                    <option value="4">4</option>
                                    <option value="8">8</option>
                                    <option value="12">12</option>
                                    <option value="16">16</option>
                                </select>
                            </SettingsRow>
                        )}
                    </div>
                </div>

                {/* Subtitles Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.subtitlesSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Subtitles className="w-4 h-4" />}
                            title={t('settings.embedSubtitles')}
                            description={t('settings.embedSubtitlesDesc')}
                            beta
                            betaNote={t('settings.embedSubtitlesNote')}
                        >
                            <Toggle enabled={settings.embedSubtitles} onToggle={handleToggleSubtitles} />
                        </SettingsRow>

                        {settings.embedSubtitles && (
                            <SettingsRow
                                icon={<Globe className="w-4 h-4" />}
                                title={t('settings.subtitleLanguages')}
                                description={t('settings.subtitleLanguagesDesc')}
                                beta
                                betaNote={t('settings.subtitleLanguagesNote')}
                            >
                                <select
                                    multiple
                                    value={settings.subtitleLanguages}
                                    onChange={handleSubtitleLanguagesChange}
                                    className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35 h-20"
                                    size={3}
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </SettingsRow>
                        )}
                    </div>
                </div>

                {/* Audio Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.audioSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Music2 className="w-4 h-4" />}
                            title={t('settings.altAudioTracks')}
                            description={t('settings.altAudioTracksDesc')}
                            beta
                            betaNote={t('settings.altAudioTracksNote')}
                        >
                            <Toggle enabled={settings.embedAltAudio} onToggle={handleToggleAltAudio} />
                        </SettingsRow>

                        {settings.embedAltAudio && (
                            <SettingsRow
                                icon={<Globe className="w-4 h-4" />}
                                title={t('settings.preferredAudioLang')}
                                description={t('settings.preferredAudioLangDesc')}
                                beta
                                betaNote={t('settings.preferredAudioLangNote')}
                            >
                                <select
                                    value={settings.preferredAudioLang}
                                    onChange={handleAudioLangChange}
                                    className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35"
                                >
                                    {LANGUAGES.map(lang => (
                                        <option key={lang.code} value={lang.code}>{lang.name}</option>
                                    ))}
                                </select>
                            </SettingsRow>
                        )}
                    </div>
                </div>

                {/* Metadata Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.metadataSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Tag className="w-4 h-4" />}
                            title={t('settings.keepThumbnail')}
                            description={t('settings.keepThumbnailDesc')}
                            beta
                            betaNote={t('settings.keepThumbnailNote')}
                        >
                            <Toggle enabled={settings.preserveThumbnail} onToggle={handleToggleThumbnail} />
                        </SettingsRow>

                        <SettingsRow
                            icon={<Tag className="w-4 h-4" />}
                            title={t('settings.embedMediaTags')}
                            description={t('settings.embedMediaTagsDesc')}
                            beta
                            betaNote={t('settings.embedMediaTagsNote')}
                        >
                            <Toggle enabled={settings.embedMetadata} onToggle={handleToggleMetadata} />
                        </SettingsRow>
                    </div>
                </div>

                {/* Account/Authentication Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.accountSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Globe className="w-4 h-4" />}
                            title={t('settings.browserCookies')}
                            description={t('settings.browserCookiesDesc')}
                            beta
                            betaNote={t('settings.browserCookiesNote')}
                        >
                            <div className="flex items-center gap-2">
                                <select
                                    value={settings.cookiesFromBrowser}
                                    onChange={handleBrowserChange}
                                    className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35"
                                >
                                    <option value="">{t('settings.noCookies')}</option>
                                    {browsers.map(browser => (
                                        <option key={browser.id} value={browser.id}>{browser.name}</option>
                                    ))}
                                </select>
                                {cookieStatus === 'checking' && (
                                    <Loader2 className="w-4 h-4 animate-spin text-foreground/50" />
                                )}
                                {cookieStatus === 'valid' && (
                                    <CheckCircle className="w-4 h-4 text-foreground" />
                                )}
                                {cookieStatus === 'invalid' && (
                                    <XCircle className="w-4 h-4 text-foreground/60" />
                                )}
                                {cookieStatus === 'unknown' && (
                                    <span className="w-2.5 h-2.5 rounded-full bg-warning inline-block" />
                                )}
                            </div>
                        </SettingsRow>
                        {settings.cookiesFromBrowser && cookieStatus === 'valid' && (
                            <div className="mt-2 p-2 bg-foreground/10 rounded-lg text-xs text-foreground/80">
                                ✓ {t('settings.cookieConnected')}
                            </div>
                        )}
                        {settings.cookiesFromBrowser && cookieStatus === 'invalid' && (
                            <div className="mt-2 p-2 bg-foreground/5 border border-foreground/15 rounded-lg text-xs text-foreground/70">
                                {t('settings.cookieInvalid')}
                            </div>
                        )}
                        {settings.cookiesFromBrowser && cookieStatus === 'unknown' && (
                            <div className="mt-2 p-2 bg-warning/10 rounded-lg text-xs text-warning">
                                {t('settings.cookieUnknown')}
                            </div>
                        )}
                    </div>
                </div>

                {/* File Naming Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.fileNamingSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Tag className="w-4 h-4" />}
                            title={t('settings.fileNameTemplate')}
                            description={t('settings.fileNameTemplateDesc')}
                        >
                            <input
                                type="text"
                                value={settings.fileNameTemplate}
                                onChange={(e) => updateSettings({ fileNameTemplate: e.target.value })}
                                placeholder="{title}"
                                className="px-3 py-1.5 rounded-lg bg-secondary border border-foreground/10 text-sm focus:outline-none focus:border-foreground/35 w-48"
                            />
                        </SettingsRow>
                        <div className="px-1 pb-2 text-xs text-foreground/45 leading-relaxed space-y-1">
                            <p>{t('settings.availableVariables')}: <code className="text-foreground/80 bg-foreground/5 px-1 rounded">{'{title}'}</code> <code className="text-foreground/80 bg-foreground/5 px-1 rounded">{'{quality}'}</code> <code className="text-foreground/80 bg-foreground/5 px-1 rounded">{'{date}'}</code> <code className="text-foreground/80 bg-foreground/5 px-1 rounded">{'{uploader}'}</code></p>
                            <p className="text-foreground/35">{t('settings.preview')}: <span className="text-foreground/50">
                                {settings.fileNameTemplate
                                    .replace(/\{title\}/g, 'My Video')
                                    .replace(/\{quality\}/g, '1080')
                                    .replace(/\{date\}/g, new Date().toISOString().slice(0, 10))
                                    .replace(/\{uploader\}/g, 'Channel Name')
                                }.mp4</span></p>
                        </div>
                    </div>
                </div>

                {/* Notifications Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.notificationsSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<Download className="w-4 h-4" />}
                            title={t('settings.desktopNotifications')}
                            description={t('settings.desktopNotificationsDesc')}
                        >
                            <Toggle enabled={settings.enableNotifications} onToggle={() => updateSettings({ enableNotifications: !settings.enableNotifications })} />
                        </SettingsRow>
                    </div>
                </div>

                {/* Keyboard Shortcuts Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.keyboardSection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <div className="space-y-3 text-sm">
                            {[
                                { keys: 'Ctrl + V', action: t('settings.shortcutHome') },
                                { keys: 'Ctrl + D', action: t('settings.shortcutDownloads') },
                                { keys: 'Ctrl + H', action: t('settings.shortcutHistory') },
                                { keys: 'Ctrl + ,', action: t('settings.shortcutSettings') },
                                { keys: 'Escape', action: t('settings.shortcutEscape') },
                            ].map(({ keys, action }) => (
                                <div key={keys} className="flex items-center justify-between py-1.5">
                                    <span className="text-foreground/60">{action}</span>
                                    <kbd className="px-2 py-0.5 rounded bg-foreground/5 border border-foreground/10 text-foreground/70 font-mono text-xs">{keys}</kbd>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>

                {/* History Section */}
                <div className="mb-8">
                    <h2 className="text-sm font-semibold text-foreground/40 uppercase tracking-wider mb-4">
                        {t('settings.historySection')}
                    </h2>
                    <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
                        <SettingsRow
                            icon={<History className="w-4 h-4" />}
                            title={t('settings.enableHistory')}
                            description={t('settings.enableHistoryDesc')}
                        >
                            <Toggle enabled={settings.historyEnabled} onToggle={handleToggleHistory} />
                        </SettingsRow>

                        {settings.historyEnabled && history.length > 0 && (
                            <SettingsRow
                                icon={<History className="w-4 h-4" />}
                                title={t('settings.clearHistory')}
                                description={t('settings.historyItemCount', { count: history.length })}
                            >
                                <button
                                    onClick={clearHistory}
                                    className="px-3 py-1.5 rounded-lg bg-foreground/5 text-foreground/65 border border-foreground/15 hover:bg-foreground/10 hover:text-foreground text-sm transition-colors"
                                >
                                    {t('settings.clearAll')}
                                </button>
                            </SettingsRow>
                        )}
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SettingsPanel;

