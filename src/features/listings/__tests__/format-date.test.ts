import { formatDate } from '../format';

describe('formatDate', () => {
  it('writes the day, month and year the way the language does', () => {
    const day = new Date(2026, 10, 16);

    expect(formatDate(day, 'pt-PT')).toBe('16/11/2026');
    expect(formatDate(day, 'en')).toBe('16 Nov 2026');
  });
});
