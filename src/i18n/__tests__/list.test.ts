import { formatList } from '../list';

jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));

describe('formatList', () => {
  it('writes names as a sentence would', () => {
    expect(formatList([])).toBe('');
    expect(formatList(['eBay'])).toBe('eBay');
    expect(formatList(['Discogs', 'eBay'])).toBe('Discogs e eBay');
    expect(formatList(['Discogs', 'eBay', 'Reverb'])).toBe('Discogs, eBay e Reverb');
  });
});
