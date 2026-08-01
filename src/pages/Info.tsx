import React, { useEffect, useState } from 'react';
import { AlertTriangle, FileText, Gavel, ShieldCheck, Target, ArrowUpCircle, Monitor, RefreshCw, Loader2 } from 'lucide-react';
import { useTranslation } from 'react-i18next';

const Info: React.FC = () => {
    const { t } = useTranslation();
    const [appVersion, setAppVersion] = useState('0.0.0');
    const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
    const [updateError, setUpdateError] = useState('');
    const [updateInfo, setUpdateInfo] = useState<{
        currentVersion: string;
        latestVersion: string;
        updateAvailable: boolean;
        releaseUrl: string;
        publishedAt: string | null;
    } | null>(null);

    useEffect(() => {
        loadAppInfo();
        checkForUpdates(false);
    }, []);

    const loadAppInfo = async () => {
        try {
            if (!window.electronAPI?.getAppInfo) return;
            const result = await window.electronAPI.getAppInfo();
            if (result?.success && result.data?.version) {
                setAppVersion(result.data.version);
            }
        } catch {
            // Keep fallback version text when app info is unavailable.
        }
    };

    const checkForUpdates = async (_manual = true) => {
        if (!window.electronAPI?.checkForUpdates) {
            setUpdateError(t('info.updateCheckUnavailable'));
            return;
        }

        setIsCheckingUpdates(true);
        setUpdateError('');

        try {
            const result = await window.electronAPI.checkForUpdates();
            if (result.success && result.data) {
                setUpdateInfo(result.data);
            } else {
                setUpdateInfo(null);
                setUpdateError(result.error || t('info.unableToCheck'));
            }
        } catch {
            setUpdateInfo(null);
            setUpdateError(t('info.unableToCheck'));
        } finally {
            setIsCheckingUpdates(false);
        }
    };

    const handleOpenUpdatePage = async () => {
        if (!updateInfo?.releaseUrl) return;

        if (window.electronAPI?.openExternalUrl) {
            await window.electronAPI.openExternalUrl(updateInfo.releaseUrl);
            return;
        }

        window.open(updateInfo.releaseUrl, '_blank', 'noopener,noreferrer');
    };

    return (
        <div className="h-full w-full bg-transparent flex flex-col gap-6 p-8 lg:p-10 overflow-auto scroll-smooth">
            <section className="panel p-6 lg:p-7">
                <div className="flex items-start gap-3">
                    <ArrowUpCircle className="w-5 h-5 text-primary mt-0.5" />
                    <div className="w-full">
                        <p className="section-title">{t('info.appAndUpdates')}</p>
                        <div className="mt-3 p-4 rounded-xl border border-foreground/10 bg-secondary/20">
                            <div className="flex items-center justify-between gap-3 flex-wrap">
                                <div className="flex items-center gap-2 text-sm text-foreground/70">
                                    <Monitor className="w-4 h-4" />
                                    <span>{t('info.versionInfo', { version: appVersion })}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                    {updateInfo?.updateAvailable && (
                                        <button
                                            onClick={handleOpenUpdatePage}
                                            className="px-3 py-1.5 rounded-lg bg-primary/20 text-primary hover:bg-primary/30 text-sm transition-colors"
                                        >
                                            {t('info.update')}
                                        </button>
                                    )}
                                    <button
                                        onClick={() => checkForUpdates(true)}
                                        disabled={isCheckingUpdates}
                                        className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 disabled:opacity-60 text-sm transition-colors inline-flex items-center gap-1.5"
                                    >
                                        {isCheckingUpdates ? (
                                            <Loader2 className="w-3.5 h-3.5 animate-spin" />
                                        ) : (
                                            <RefreshCw className="w-3.5 h-3.5" />
                                        )}
                                        {t('info.checkNow')}
                                    </button>
                                </div>
                            </div>

                            <p className="text-sm text-foreground/70 mt-3">
                                {updateInfo
                                    ? updateInfo.updateAvailable
                                        ? t('info.updateAvailable', { latest: updateInfo.latestVersion, current: updateInfo.currentVersion })
                                        : t('info.upToDate', { version: updateInfo.currentVersion })
                                    : updateError || t('info.checking')}
                            </p>

                            {updateInfo?.updateAvailable && (
                                <div className="mt-3 p-2 bg-primary/10 rounded-lg text-xs text-primary">
                                    {t('info.updateAvailableDesc')}
                                </div>
                            )}
                            {!updateInfo?.updateAvailable && updateInfo && (
                                <div className="mt-3 p-2 bg-foreground/10 rounded-lg text-xs text-foreground/80">
                                    {t('info.latestRelease')}
                                </div>
                            )}
                            {updateError && (
                                <div className="mt-3 p-2 bg-foreground/5 border border-foreground/15 rounded-lg text-xs text-foreground/70">
                                    {updateError}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-7">
                <div className="flex items-start gap-3">
                    <Target className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                        <p className="section-title">{t('info.programPurpose')}</p>
                        <h1 className="text-2xl lg:text-3xl font-semibold tracking-tight text-foreground mt-1">
                            {t('info.appName')}
                        </h1>
                        <p className="text-foreground/70 text-sm leading-relaxed mt-3 max-w-3xl">
                            {t('info.appDescription')}
                        </p>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-7">
                <div className="flex items-start gap-3">
                    <FileText className="w-5 h-5 text-accent mt-0.5" />
                    <div>
                        <p className="section-title">{t('info.developmentAim')}</p>
                        <ul className="text-sm text-foreground/70 leading-relaxed mt-2 space-y-2 list-disc pl-5">
                            <li>{t('info.aim1')}</li>
                            <li>{t('info.aim2')}</li>
                            <li>{t('info.aim3')}</li>
                            <li>{t('info.aim4')}</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-7 border border-warning/25">
                <div className="flex items-start gap-3">
                    <Gavel className="w-5 h-5 text-warning mt-0.5" />
                    <div>
                        <p className="section-title">{t('info.legalResponsibility')}</p>
                        <p className="text-sm text-foreground/75 leading-relaxed mt-2">
                            {t('info.legalText1')}
                        </p>
                        <p className="text-sm text-foreground/75 leading-relaxed mt-2">
                            {t('info.legalText2')}
                        </p>
                    </div>
                </div>
            </section>

            <section className="panel p-6 lg:p-7">
                <div className="flex items-start gap-3">
                    <ShieldCheck className="w-5 h-5 text-success mt-0.5" />
                    <div>
                        <p className="section-title">{t('info.securityNotes')}</p>
                        <ul className="text-sm text-foreground/70 leading-relaxed mt-2 space-y-2 list-disc pl-5">
                            <li>{t('info.security1')}</li>
                            <li>{t('info.security2')}</li>
                            <li>{t('info.security3')}</li>
                        </ul>
                    </div>
                </div>
            </section>

            <section className="panel p-4 lg:p-5 border border-error/25 bg-error/5">
                <div className="flex items-start gap-3">
                    <AlertTriangle className="w-5 h-5 text-error mt-0.5" />
                    <p className="text-sm text-foreground/80 leading-relaxed">
                        {t('info.disclaimer')}
                    </p>
                </div>
            </section>
        </div>
    );
};

export default Info;
