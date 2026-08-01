import React, { useEffect, useMemo, useState } from 'react';
import { CheckCircle2, AlertCircle, Copy, ExternalLink, RefreshCw } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface RuntimeDependency {
  id: string;
  name: string;
  required: boolean;
  installed: boolean;
  installCommand: string;
  helpUrl: string;
}

interface RuntimeStatus {
  platform: 'windows' | 'macos' | 'linux';
  dependencies: RuntimeDependency[];
}

interface SetupWizardProps {
  isOpen: boolean;
  onClose: () => void;
}

const SetupWizard: React.FC<SetupWizardProps> = ({ isOpen, onClose }) => {
  const { t } = useTranslation();
  const [status, setStatus] = useState<RuntimeStatus | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [copiedDependencyId, setCopiedDependencyId] = useState<string>('');
  const [allowLimitedMode, setAllowLimitedMode] = useState(false);

  const refreshStatus = async () => {
    if (!window.electronAPI?.getRuntimeDependenciesStatus) return;

    setIsLoading(true);
    try {
      const result = await window.electronAPI.getRuntimeDependenciesStatus();
      if (result.success && result.data) {
        setStatus(result.data);
      }
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isOpen) return;
    setAllowLimitedMode(false);
    refreshStatus();
  }, [isOpen]);

  const missingRequired = useMemo(
    () => (status?.dependencies || []).filter((item) => item.required && !item.installed),
    [status]
  );

  const copyCommand = async (id: string, command: string) => {
    try {
      await navigator.clipboard.writeText(command);
      setCopiedDependencyId(id);
      setTimeout(() => setCopiedDependencyId(''), 1200);
    } catch {
      setCopiedDependencyId('');
    }
  };

  const openLink = async (url: string) => {
    if (window.electronAPI?.openExternalUrl) {
      const result = await window.electronAPI.openExternalUrl(url);
      if (!result.success) {
        window.open(url, '_blank');
      }
      return;
    }
    window.open(url, '_blank');
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-3xl panel p-6 lg:p-7 border border-foreground/15 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-title">{t('setupWizard.firstRunSetup')}</p>
            <h2 className="text-xl lg:text-2xl font-semibold mt-2">{t('setupWizard.prepareRuntime')}</h2>
            <p className="text-sm text-foreground/70 mt-2 max-w-2xl">
              {t('setupWizard.runtimeDesc')}
            </p>
          </div>
          <button
            onClick={refreshStatus}
            className="btn-ghost"
            disabled={isLoading}
            title="Recheck dependencies"
          >
            <RefreshCw className={`w-4 h-4 ${isLoading ? 'animate-spin' : ''}`} />
            {t('setupWizard.recheck')}
          </button>
        </div>

        <div className="mt-5 text-xs text-foreground/50">
          {t('setupWizard.platform')}: <span className="text-foreground/80 font-medium">{status?.platform || t('common.unknown')}</span>
        </div>

        <div className="mt-4 space-y-3 max-h-[48vh] overflow-auto pr-1">
          {(status?.dependencies || []).map((item) => (
            <div key={item.id} className="surface-subtle p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    {item.installed ? (
                      <CheckCircle2 className="w-4 h-4 text-success" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-warning" />
                    )}
                    <p className="text-sm font-medium">
                      {item.name}
                      {item.required ? <span className="text-warning"> ({t('setupWizard.required')})</span> : <span className="text-foreground/50"> ({t('setupWizard.optional')})</span>}
                    </p>
                  </div>
                  <p className="text-xs text-foreground/60 mt-1">
                    {item.installed ? t('setupWizard.detected') : t('setupWizard.notFound')}
                  </p>
                </div>
                <button
                  onClick={() => openLink(item.helpUrl)}
                  className="btn-ghost"
                  title="Open official install guide"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  {t('setupWizard.guide')}
                </button>
              </div>

              {!item.installed && (
                <>
                  <pre className="mt-3 bg-background/60 border border-foreground/10 rounded-lg p-3 text-xs whitespace-pre-wrap break-words">
                    {item.installCommand}
                  </pre>
                  <button
                    onClick={() => copyCommand(item.id, item.installCommand)}
                    className="btn-ghost mt-2"
                  >
                    <Copy className="w-3.5 h-3.5" />
                    {copiedDependencyId === item.id ? t('setupWizard.copied') : t('setupWizard.copyCommand')}
                  </button>
                </>
              )}
            </div>
          ))}
        </div>

        {missingRequired.length > 0 && (
          <div className="mt-4 rounded-lg border border-warning/25 bg-warning/10 p-3 text-sm text-warning">
            {t('setupWizard.missingWarning')}
          </div>
        )}

        {missingRequired.length > 0 && (
          <label className="mt-3 flex items-start gap-2 text-xs text-foreground/70">
            <input
              type="checkbox"
              className="mt-0.5"
              checked={allowLimitedMode}
              onChange={(event) => setAllowLimitedMode(event.target.checked)}
            />
            {t('setupWizard.limitedModeAck')}
          </label>
        )}

        <div className="mt-6 flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            disabled={missingRequired.length > 0 && !allowLimitedMode}
            className="btn-primary px-4 py-2 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {missingRequired.length > 0 ? t('setupWizard.continueLimit') : t('setupWizard.continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default SetupWizard;
