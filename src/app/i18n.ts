import i18n from 'i18next';
import LanguageDetector from 'i18next-browser-languagedetector';
import Backend, { HttpBackendOptions } from 'i18next-http-backend';
import { initReactI18next } from 'react-i18next';
import { locale } from '@tauri-apps/plugin-os';
import { getTauriSettings } from './state/utils/tauriStore';
import { trimTrailingSlash } from './utils/common';
import { isDesktopTauri } from './plugins/useTauriOpener';

const chain = i18n.use(Backend).use(initReactI18next);

if (!isDesktopTauri) {
  chain.use(LanguageDetector);
}

chain
  .init<HttpBackendOptions>({
    debug: false,
    fallbackLng: 'en',
    interpolation: {
      escapeValue: false, // not needed for react as it escapes by default
    },
    load: 'languageOnly',
    backend: {
      loadPath: `${trimTrailingSlash(import.meta.env.BASE_URL)}/public/locales/{{lng}}.json`,
    },
  })
  .then(async () => {
    if (!isDesktopTauri) return;
    try {
      const settings = await getTauriSettings<{ language?: string }>();
      const persisted = settings?.language ?? null;
      if (persisted) {
        await i18n.changeLanguage(persisted);
        return;
      }
      const osLocale = await locale();
      if (osLocale) {
        const langOnly = osLocale.split('-')[0];
        await i18n.changeLanguage(langOnly);
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.warn('[i18n] Tauri language detection failed, using fallback:', err);
    }
  });

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'zh', name: '简体中文' },
];

export default i18n;
