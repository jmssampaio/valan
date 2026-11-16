// European Portuguese is the source language: every other locale must have the same keys.
export const ptPT = {
  'tabs.listings': 'Anúncios',
  'tabs.offers': 'Propostas',
  'tabs.sales': 'Vendas',
  'tabs.account': 'Conta',
  'welcome.title': 'Publica uma vez.\nVende em todo o lado.',
  'connect.title': 'Liga as tuas contas',
  'newListing.catalogue.title': 'O que vais vender?',
  'newListing.condition.title': 'Estado e fotos',
  'newListing.price.title': 'Preço e plataformas',
  'newListing.result.title': 'Resultado',
  'listing.title': 'Anúncio',
  'subscription.title': 'Vende em todo o lado, a partir de um só sítio',
  'notFound.title': 'Esta página não existe',
  'notFound.action': 'Ir para Anúncios',
} as const;

export type TranslationKey = keyof typeof ptPT;
export type Translations = Record<TranslationKey, string>;
