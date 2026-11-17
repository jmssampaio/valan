import { deviceLanguage, type Language } from '@/i18n';

const localeByLanguage: Record<Language, string> = {
  'pt-PT': 'pt-PT',
  es: 'es-ES',
  en: 'en-GB',
};

const MINOR_UNITS_PER_UNIT = 100;

/** Whole amounts drop the decimals ("28 €"); anything else keeps the cents ("28,50 €"). */
export function formatPrice(
  amountMinor: number,
  currency: string,
  language: Language = deviceLanguage,
): string {
  const fractionDigits = amountMinor % MINOR_UNITS_PER_UNIT === 0 ? 0 : 2;
  return new Intl.NumberFormat(localeByLanguage[language], {
    style: 'currency',
    currency,
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(amountMinor / MINOR_UNITS_PER_UNIT);
}

export function formatMonth(date: Date, language: Language = deviceLanguage): string {
  return new Intl.DateTimeFormat(localeByLanguage[language], { month: 'short' }).format(date);
}
