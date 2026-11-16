import { resolveLanguage, translate } from '@/i18n';

const locale = (languageCode: string | null, languageTag: string) => ({
  languageCode,
  languageTag,
});

describe('resolveLanguage', () => {
  it('uses European Portuguese for any Portuguese device language', () => {
    expect(resolveLanguage([locale('pt', 'pt-BR')])).toBe('pt-PT');
  });

  it('uses Spanish for a Spanish device language', () => {
    expect(resolveLanguage([locale('es', 'es-MX')])).toBe('es');
  });

  it('picks the first supported language in the order the user set', () => {
    expect(resolveLanguage([locale('fr', 'fr-FR'), locale('es', 'es-ES'), locale('en', 'en-GB')])).toBe(
      'es',
    );
  });

  it('falls back to English when no device language is supported', () => {
    expect(resolveLanguage([locale('de', 'de-DE')])).toBe('en');
  });

  it('ignores locales without a language code', () => {
    expect(resolveLanguage([locale(null, 'und'), locale('pt', 'pt-PT')])).toBe('pt-PT');
  });
});

describe('translate', () => {
  it('returns the text for the given language', () => {
    expect(translate('es', 'tabs.listings')).toBe('Anuncios');
  });
});
