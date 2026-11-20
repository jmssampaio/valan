import { render, screen, within } from '@testing-library/react-native';

import { ChipRow } from '@/components/chip-row';
import { PlatformChip } from '@/components/platform-chip';
import { Colors } from '@/constants/theme';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));

describe('PlatformChip', () => {
  it.each([
    ['live', 'Discogs · publicado'],
    ['pending', 'Discogs · a publicar'],
    ['paused', 'Discogs · em pausa'],
    ['error', 'Discogs · erro'],
    ['sold', 'Discogs · vendido'],
    ['off', 'Discogs · retirado'],
  ] as const)('says the %s state in words beside the marketplace', async (state, words) => {
    await render(<PlatformChip name="Discogs" state={state} />);

    expect(screen.getByText(words)).toBeOnTheScreen();
  });

  it('shows the name it is given, so no marketplace is written into the chip', async () => {
    await render(<PlatformChip name="Reverb" state="live" />);

    expect(screen.getByText('Reverb · publicado')).toBeOnTheScreen();
  });

  it('marks the state with a symbol beside the words, which screen readers skip', async () => {
    await render(<PlatformChip name="eBay" state="error" />);

    expect(screen.getByTestId('icon', { includeHiddenElements: true })).toBeOnTheScreen();
    expect(screen.queryByRole('image')).not.toBeOnTheScreen();
  });

  it('fills a published chip with the brand colour and an error chip with its tint', async () => {
    await render(
      <>
        <PlatformChip name="Discogs" state="live" />
        <PlatformChip name="eBay" state="error" />
      </>,
    );

    expect(screen.getByTestId('chip-live')).toHaveStyle({ backgroundColor: Colors.primary });
    expect(screen.getByText('Discogs · publicado')).toHaveStyle({ color: Colors.onPrimary });
    expect(screen.getByTestId('chip-error')).toHaveStyle({ backgroundColor: Colors.dangerTint });
    expect(screen.getByText('eBay · erro')).toHaveStyle({ color: Colors.danger });
  });
});

describe('ChipRow', () => {
  it('shows one chip for each marketplace, in the order given', async () => {
    await render(
      <ChipRow
        testID="chips"
        items={[
          { key: 'discogs', name: 'Discogs', state: 'live' },
          { key: 'ebay', name: 'eBay', state: 'error' },
        ]}
      />,
    );

    const texts = within(screen.getByTestId('chips'))
      .getAllByText(/ · /)
      .map((element) => element.props.children);
    expect(texts).toEqual(['Discogs · publicado', 'eBay · erro']);
  });
});
