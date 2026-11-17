import { renderRouter, screen } from 'expo-router/testing-library';

import { countPendingOffers } from '@/services/offers';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));
jest.mock('@/services/offers');

const pendingOffers = jest.mocked(countPendingOffers);

describe('TabBar badge', () => {
  it('shows how many offers are waiting, and says so to screen readers', async () => {
    pendingOffers.mockResolvedValue(3);

    await renderRouter('src/app');

    const offersTab = await screen.findByRole('tab', { name: 'Propostas', value: { text: '3 propostas por responder' } });
    expect(offersTab).toHaveTextContent('Propostas3');
  });

  it('speaks of one offer in the singular', async () => {
    pendingOffers.mockResolvedValue(1);

    await renderRouter('src/app');

    expect(
      await screen.findByRole('tab', { name: 'Propostas', value: { text: '1 proposta por responder' } }),
    ).toBeOnTheScreen();
  });

  it('shows no badge when no offer is waiting', async () => {
    pendingOffers.mockResolvedValue(0);

    await renderRouter('src/app');

    expect(await screen.findByRole('tab', { name: 'Propostas' })).toHaveTextContent('Propostas');
  });

  it('shows no badge when the count cannot be loaded', async () => {
    pendingOffers.mockRejectedValue(new Error('network'));

    await renderRouter('src/app');

    expect(await screen.findByRole('tab', { name: 'Propostas' })).toHaveTextContent('Propostas');
  });
});
