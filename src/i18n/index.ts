import { getLocales } from 'expo-localization';

import { en } from './locales/en';
import { es } from './locales/es';
import { ptPT, type TranslationKey, type Translations } from './locales/pt-PT';

export type { TranslationKey };

export type Language = 'pt-PT' | 'es' | 'en';

const FALLBACK_LANGUAGE: Language = 'en';

const languageByCode: Record<string, Language> = {
  pt: 'pt-PT',
  es: 'es',
  en: 'en',
};

const translations: Record<Language, Translations> = {
  'pt-PT': ptPT,
  es,
  en,
};

type DeviceLocale = {
  languageCode: string | null;
};

export function resolveLanguage(deviceLocales: readonly DeviceLocale[]): Language {
  for (const { languageCode } of deviceLocales) {
    const language = languageCode ? languageByCode[languageCode] : undefined;
    if (language) return language;
  }
  return FALLBACK_LANGUAGE;
}

export function translate(language: Language, key: TranslationKey): string {
  return translations[language][key];
}

// iOS keeps the device locales fixed while the app runs, so the language is read once.
export const deviceLanguage: Language = resolveLanguage(getLocales());

export function t(key: TranslationKey): string {
  return translate(deviceLanguage, key);
}
