import React from 'react';
import { AppWindow, Contrast, Download, X } from 'lucide-react';
import { useTranslation } from 'react-i18next';

interface WhatsNewModalProps {
  isOpen: boolean;
  version: string;
  onClose: () => void;
}

const WhatsNewModal: React.FC<WhatsNewModalProps> = ({ isOpen, version, onClose }) => {
  const { t } = useTranslation();
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[70] flex items-center justify-center bg-background/80 backdrop-blur-sm p-4">
      <div className="w-full max-w-2xl panel p-6 lg:p-7 border border-foreground/15 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="section-title">{t('whatsNew.title')}</p>
            <h2 className="text-xl lg:text-2xl font-semibold mt-2">
              {t('whatsNew.welcome', { version: version || 'latest' })}
            </h2>
            <p className="text-sm text-foreground/70 mt-2 max-w-xl">
              {t('whatsNew.description')}
            </p>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-lg hover:bg-foreground/10 text-foreground/60 hover:text-foreground transition-colors"
            title="Close"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-5 space-y-3">
          <div className="surface-subtle p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <AppWindow className="w-4 h-4 text-primary" />
              {t('whatsNew.feature1Title')}
            </div>
            <p className="text-xs text-foreground/65 mt-1">
              {t('whatsNew.feature1Desc')}
            </p>
          </div>

          <div className="surface-subtle p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Download className="w-4 h-4 text-primary" />
              {t('whatsNew.feature2Title')}
            </div>
            <p className="text-xs text-foreground/65 mt-1">
              {t('whatsNew.feature2Desc')}
            </p>
          </div>

          <div className="surface-subtle p-4">
            <div className="flex items-center gap-2 text-sm font-medium">
              <Contrast className="w-4 h-4 text-primary" />
              {t('whatsNew.feature3Title')}
            </div>
            <p className="text-xs text-foreground/65 mt-1">
              {t('whatsNew.feature3Desc')}
            </p>
          </div>
        </div>

        <div className="mt-6 flex justify-end">
          <button onClick={onClose} className="btn-primary px-4 py-2 rounded-lg">
            {t('whatsNew.continue')}
          </button>
        </div>
      </div>
    </div>
  );
};

export default WhatsNewModal;
