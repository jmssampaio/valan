import {
  acceptConfirmation,
  actionLabel,
  cardFacts,
  offerAction,
  offerTabs,
  outcomeTag,
  splitOffers,
} from '../labels';

import type { OfferRow } from '@/services/offers';
import type { Tables } from '@/types/database';

// The device language is a system boundary: fix it so labels are predictable.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));

const NOW = new Date('2026-11-17T12:00:00Z');
const HOUR_MS = 3_600_000;

function inHours(hours: number): string {
  return new Date(NOW.getTime() + hours * HOUR_MS).toISOString();
}

function row(
  overrides: Partial<Tables<'offers'>> = {},
  marketplace: OfferRow['marketplace'] = 'ebay',
  listingUrl: string | null = 'https://www.ebay.com/',
): OfferRow {
  return {
    offer: {
      id: 'offer-1',
      user_id: 'user-1',
      listing_id: 'listing-1',
      external_id: 'x',
      buyer: 'vinil_porto',
      amount_minor: 2400,
      currency: 'EUR',
      status: 'pending',
      expires_at: inHours(21),
      created_at: '2026-11-16T10:00:00Z',
      updated_at: '2026-11-16T10:00:00Z',
      ...overrides,
    },
    item: { id: 'item-1', title: 'Noites de Lisboa', price_minor: 2800, currency: 'EUR' },
    marketplace,
    listingUrl,
  };
}

describe('splitOffers', () => {
  it('keeps the offers waiting for an answer apart from the answered ones', () => {
    const waiting = row({ id: 'a' });
    const accepted = row({ id: 'b', status: 'accepted' });

    const { pending, answered } = splitOffers([accepted, waiting], NOW);

    expect(pending.map(({ offer }) => offer.id)).toEqual(['a']);
    expect(answered.map(({ offer }) => offer.id)).toEqual(['b']);
  });

  it('counts a pending offer that ran out of time as answered, not as pending', () => {
    const lapsed = row({ id: 'late', expires_at: inHours(-1) });

    const { pending, answered } = splitOffers([lapsed], NOW);

    expect(pending).toEqual([]);
    expect(answered).toHaveLength(1);
  });

  it('puts the offer that expires first at the top, and one that never expires last', () => {
    const never = row({ id: 'never', expires_at: null });
    const later = row({ id: 'later', expires_at: inHours(50) });
    const soon = row({ id: 'soon', expires_at: inHours(21) });

    const { pending } = splitOffers([never, later, soon], NOW);

    expect(pending.map(({ offer }) => offer.id)).toEqual(['soon', 'later', 'never']);
  });

  it('puts the offer answered last at the top of the answered ones', () => {
    const older = row({ id: 'older', status: 'rejected', updated_at: '2026-11-10T10:00:00Z' });
    const newer = row({ id: 'newer', status: 'accepted', updated_at: '2026-11-12T10:00:00Z' });

    const { answered } = splitOffers([older, newer], NOW);

    expect(answered.map(({ offer }) => offer.id)).toEqual(['newer', 'older']);
  });
});

describe('offerTabs', () => {
  it('counts the offers waiting for an answer, and leaves the answered ones uncounted', () => {
    expect(offerTabs(3)).toEqual([
      { value: 'pending', label: 'Pendentes · 3' },
      { value: 'answered', label: 'Respondidas' },
    ]);
  });
});

describe('cardFacts', () => {
  it('gives the item, who offered where and when it expires, what is asked and what is offered', () => {
    expect(cardFacts(row(), NOW)).toEqual({
      title: 'Noites de Lisboa',
      meta: 'vinil_porto · eBay · Expira em 21 h',
      asking: 'Pedes 28 €',
      price: '24 €',
    });
  });

  it('names only the marketplace when the buyer is unknown', () => {
    expect(cardFacts(row({ buyer: null, expires_at: null }), NOW).meta).toBe('eBay');
  });

  it('says it has expired once it has', () => {
    expect(cardFacts(row({ expires_at: inHours(-2) }), NOW).meta).toBe('vinil_porto · eBay · Expirou');
  });

  it('has nothing to say about what is asked when the item has no price', () => {
    const noPrice = { ...row(), item: { ...row().item, price_minor: null } };

    expect(cardFacts(noPrice, NOW).asking).toBeNull();
  });
});

describe('offerAction', () => {
  it('lets the seller answer on a marketplace that can be answered from outside', () => {
    expect(offerAction(row(), NOW)).toBe('respond');
  });

  it('sends the seller to the marketplace when it cannot be answered from outside', () => {
    expect(offerAction(row({}, 'discogs', 'https://www.discogs.com/'), NOW)).toBe('openOnMarketplace');
  });

  it('has nothing to offer for such an offer when there is nowhere to send the seller', () => {
    expect(offerAction(row({}, 'discogs', null), NOW)).toBe('none');
  });

  it('only says an expired offer cannot be answered', () => {
    expect(offerAction(row({ expires_at: inHours(-1) }), NOW)).toBe('expired');
    expect(offerAction(row({ expires_at: inHours(-1) }, 'discogs'), NOW)).toBe('expired');
    expect(offerAction(row({ status: 'expired' }), NOW)).toBe('expired');
  });

  it('offers nothing for an offer that was already answered', () => {
    expect(offerAction(row({ status: 'accepted' }), NOW)).toBe('none');
  });
});

describe('outcomeTag', () => {
  it.each([
    ['accepted', 'Aceite', 'success'],
    ['rejected', 'Rejeitada', 'neutral'],
    ['expired', 'Expirada', 'waiting'],
    ['withdrawn', 'Retirada', 'waiting'],
  ] as const)('marks an offer that is %s', (status, label, tone) => {
    expect(outcomeTag(row({ status }), NOW)).toEqual({ label, tone });
  });

  it('marks a pending offer that ran out of time as expired', () => {
    expect(outcomeTag(row({ expires_at: inHours(-1) }), NOW)).toEqual({
      label: 'Expirada',
      tone: 'waiting',
    });
  });
});

describe('acceptConfirmation', () => {
  it('names the buyer, the item and the amount', () => {
    expect(acceptConfirmation(row())).toEqual({
      title: 'Aceitar 24 €?',
      body: 'vinil_porto compra "Noites de Lisboa" por 24 €. A venda fica registada e o anúncio sai das outras plataformas. Não podes desfazer.',
    });
  });

  it('says "the buyer" when the buyer is unknown', () => {
    expect(acceptConfirmation(row({ buyer: null })).body).toMatch(/^O comprador compra/);
  });
});

describe('actionLabel', () => {
  it('tells apart the buttons of different offers, for screen readers', () => {
    expect(actionLabel('accept', row())).toBe('Aceitar a proposta de 24 € para Noites de Lisboa');
    expect(actionLabel('reject', row())).toBe('Rejeitar a proposta de 24 € para Noites de Lisboa');
    expect(actionLabel('openOn', row({}, 'discogs'))).toBe(
      'Responder em Discogs à proposta de 24 € para Noites de Lisboa',
    );
  });
});
