import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, RefreshCw, Copy, ExternalLink, ShieldCheck } from 'lucide-react';
import { useTranslation } from 'react-i18next';

type PlatformId = 'windows' | 'macos' | 'linux';

interface RuntimeDependency {
  id: string;
  name: string;
  required: boolean;
  installed: boolean;
  installCommand: string;
  helpUrl: string;
}

interface RuntimeStatus {
  platform: PlatformId;
  dependencies: RuntimeDependency[];
}

const System: React.FC = () => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedId, setCopiedId] = useState('');
  const [error, setError] = useState('');

  const loadStatus = async () => {
    if (!window.electronAPI?.getRuntimeDependenciesStatus) {
      setError(t('system.unavailable'));
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const result = await window.electronAPI.getRuntimeDependenciesStatus();
      if (result.success && result.data) {
        setStatus(result.data);
      } else {
        setError(t('system.loadError'));
      }
    } catch {
      setError('Could not load dependency status.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStatus();
  }, []);

  const missingRequired = useMemo(
    () => (status?.dependencies || []).filter((item) => item.required && !item.installed),
    [status],
  );

  const copyCommand = async (id: string, command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedId(id);
      setTimeout(() => setCopiedId(''), 1200);
    } catch {
      setCopiedId('');
    }
  };

  const openLink = async (url: string) => {
    if (window.electronAPI?.openExternalUrl) {
      const result = await window.electronAPI.openExternalUrl(url);
      if (!result.success) {
        window.open(url, '_blank', 'noopener,noreferrer');
      }
      return;
    }

    window.open(url, '_blank', 'noopener,noreferrer');
  };

  return (
    <div className="h-full w-full bg-transparent p-8 overflow-auto">
      <div className="max-w-3xl mx-auto">
        <div className="mb-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 text-primary text-xs font-medium">
            <ShieldCheck className="w-3.5 h-3.5" />
            System Check
          </div>
          <h1 className="text-2xl font-bold mt-3">{t('system.title')}</h1>
          <p className="text-foreground/60 mt-2">
            {t('system.description')}
          </p>
        </div>

        <div className="bg-secondary/30 rounded-2xl p-4 border border-foreground/5">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-foreground/60">
              {t('system.platform')}: <span className="text-foreground/85 font-medium">{status?.platform || t('common.unknown')}</span>
            </p>
            <button
              onClick={loadStatus}
              className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors inline-flex items-center gap-1.5"
              disabled={isLoading}
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isLoading ? 'animate-spin' : ''}`} />
              {t('system.recheck')}
            </button>
          </div>

          {missingRequired.length > 0 && (
            <div className="mt-3 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
              {t('system.missingWarning')}
            </div>
          )}

          {error && (
            <div className="mt-3 rounded-lg border border-foreground/20 bg-foreground/5 p-3 text-sm text-foreground/75">
              {error}
            </div>
          )}

          <div className="mt-4 space-y-3">
            {(status?.dependencies || []).map((item) => (
              <div key={item.id} className="surface-subtle p-4 border border-foreground/10 rounded-xl">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="flex items-center gap-2">
                      {item.installed ? (
                        <CheckCircle2 className="w-4 h-4 text-foreground" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-warning" />
                      )}
                      <p className="text-sm font-medium">
                        {item.name}
                        {item.required ? (
                          <span className="text-warning"> ({t('system.required')})</span>
                        ) : (
                          <span className="text-foreground/50"> ({t('system.optional')})</span>
                        )}
                      </p>
                    </div>
                    <p className="text-xs text-foreground/60 mt-1">
                      {item.installed ? t('system.detected') : t('system.notFound')}
                    </p>
                  </div>

                  <button
                    onClick={() => openLink(item.helpUrl)}
                    className="px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors inline-flex items-center gap-1.5"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    {t('system.guide')}
                  </button>
                </div>

                {!item.installed && (
                  <>
                    <pre className="mt-3 bg-background/60 border border-foreground/10 rounded-lg p-3 text-xs whitespace-pre-wrap break-words">
                      {item.installCommand}
                    </pre>
                    <button
                      onClick={() => copyCommand(item.id, item.installCommand)}
                      className="mt-2 px-3 py-1.5 rounded-lg bg-foreground/5 hover:bg-foreground/10 text-sm transition-colors inline-flex items-center gap-1.5"
                    >
                      <Copy className="w-3.5 h-3.5" />
                      {copiedId === item.id ? t('system.copied') : t('system.copyCommand')}
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default System;
