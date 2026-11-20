import { chipState } from '@/features/listings/chip-state';

describe('chipState', () => {
  it.each([
    ['published', 'live'],
    ['pending', 'pending'],
    ['paused', 'paused'],
    ['error', 'error'],
    ['removed', 'off'],
  ] as const)('shows a %s listing as %s', (status, state) => {
    expect(chipState({ marketplace: 'ebay', status })).toBe(state);
  });

  it('shows the marketplace the item sold on as sold, whatever its listing says', () => {
    expect(chipState({ marketplace: 'ebay', status: 'published' }, 'ebay')).toBe('sold');
    expect(chipState({ marketplace: 'ebay', status: 'removed' }, 'ebay')).toBe('sold');
  });

  it('shows every other marketplace as off once the item sold elsewhere', () => {
    expect(chipState({ marketplace: 'discogs', status: 'published' }, 'ebay')).toBe('off');
    expect(chipState({ marketplace: 'discogs', status: 'error' }, 'ebay')).toBe('off');
  });
});
