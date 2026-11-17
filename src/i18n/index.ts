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

export const translationKeys = Object.keys(ptPT) as TranslationKey[];

export type TranslationValues = Record<string, string | number>;

/** Replaces each {name} in the text with its value; names without a value stay as written. */
export function translate(
  language: Language,
  key: TranslationKey,
  values?: TranslationValues,
): string {
  const text = translations[language][key];
  if (!values) return text;
  return text.replace(/\{(\w+)\}/g, (placeholder, name: string) =>
    name in values ? String(values[name]) : placeholder,
  );
}

// iOS keeps the device locales fixed while the app runs, so the language is read once.
export const deviceLanguage: Language = resolveLanguage(getLocales());

export function t(key: TranslationKey, values?: TranslationValues): string {
  return translate(deviceLanguage, key, values);
}
