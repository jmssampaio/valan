import { t } from '@/i18n';

// babel-jest hoists jest.mock above the import, so the device locale is mocked before the module reads it.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'es', languageTag: 'es-ES' }],
}));

describe('t', () => {
  it('translates into the device language', () => {
    expect(t('tabs.sales')).toBe('Ventas');
  });
});
