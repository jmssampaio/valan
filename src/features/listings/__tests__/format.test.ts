import { formatMonth, formatPrice } from '../format';

describe('formatPrice', () => {
  it('shows a whole price without decimals', () => {
    expect(formatPrice(2800, 'EUR', 'pt-PT')).toBe('28 €');
  });

  it('keeps the cents when there are any', () => {
    expect(formatPrice(2850, 'EUR', 'pt-PT')).toBe('28,50 €');
  });

  it('follows the conventions of the language', () => {
    expect(formatPrice(141200, 'EUR', 'en')).toBe('€1,412');
  });
});

describe('formatMonth', () => {
  it('abbreviates the month in the language', () => {
    const november = new Date(2026, 10, 16);

    expect(formatMonth(november, 'pt-PT')).toBe('nov.');
    expect(formatMonth(november, 'en')).toBe('Nov');
  });
});
