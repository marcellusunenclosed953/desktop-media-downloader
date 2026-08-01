import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';

import en from './locales/en.json';
import tr from './locales/tr.json';
import es from './locales/es.json';
import fr from './locales/fr.json';
import de from './locales/de.json';
import ja from './locales/ja.json';
import ko from './locales/ko.json';
import zh from './locales/zh.json';
import pt from './locales/pt.json';
import ru from './locales/ru.json';

export const SUPPORTED_LANGUAGES = [
    { code: 'en', name: 'English', flag: '🇬🇧' },
    { code: 'tr', name: 'Türkçe', flag: '🇹🇷' },
    { code: 'es', name: 'Español', flag: '🇪🇸' },
    { code: 'fr', name: 'Français', flag: '🇫🇷' },
    { code: 'de', name: 'Deutsch', flag: '🇩🇪' },
    { code: 'ja', name: '日本語', flag: '🇯🇵' },
    { code: 'ko', name: '한국어', flag: '🇰🇷' },
    { code: 'zh', name: '简体中文', flag: '🇨🇳' },
    { code: 'pt', name: 'Português (BR)', flag: '🇧🇷' },
    { code: 'ru', name: 'Русский', flag: '🇷🇺' },
] as const;

const LANGUAGE_STORAGE_KEY = 'desktop-media-ui-language';

const getInitialLanguage = (): string => {
    const stored = localStorage.getItem(LANGUAGE_STORAGE_KEY);
    if (stored && SUPPORTED_LANGUAGES.some(l => l.code === stored)) {
        return stored;
    }

    const browserLang = navigator.language?.split('-')[0];
    if (browserLang && SUPPORTED_LANGUAGES.some(l => l.code === browserLang)) {
        return browserLang;
    }

    return 'en';
};

i18n.use(initReactI18next).init({
    resources: {
        en: { translation: en },
        tr: { translation: tr },
        es: { translation: es },
        fr: { translation: fr },
        de: { translation: de },
        ja: { translation: ja },
        ko: { translation: ko },
        zh: { translation: zh },
        pt: { translation: pt },
        ru: { translation: ru },
    },
    lng: getInitialLanguage(),
    fallbackLng: 'en',
    interpolation: {
        escapeValue: false, // React already escapes
    },
});

// Persist language changes
i18n.on('languageChanged', (lng: string) => {
    localStorage.setItem(LANGUAGE_STORAGE_KEY, lng);
});

export default i18n;
