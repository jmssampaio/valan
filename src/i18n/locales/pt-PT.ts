// European Portuguese is the source language: every other locale must have the same keys.
export const ptPT = {
  'tabs.listings': 'Anúncios',
  'tabs.offers': 'Propostas',
  'tabs.sales': 'Vendas',
  'tabs.account': 'Conta',
} as const;

export type TranslationKey = keyof typeof ptPT;
export type Translations = Record<TranslationKey, string>;
