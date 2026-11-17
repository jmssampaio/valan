import {
  equipmentConditionDetail,
  equipmentConditionOptions,
  gradeDetail,
  gradeOptions,
  releaseDetail,
  releaseLabel,
} from '../labels';

import type { CatalogueRelease } from '@/services/catalogue';

// The device language is a system boundary: fix it so labels are predictable.
jest.mock('expo-localization', () => ({
  getLocales: () => [{ languageCode: 'pt', languageTag: 'pt-PT' }],
}));

const release: CatalogueRelease = {
  id: 249504,
  title: 'Noites de Lisboa',
  artist: 'Os Marés',
  format: 'LP, Album',
  year: 1978,
  country: 'Portugal',
  label: 'Onda Discos',
  catalogueNumber: 'OD 1042',
};

describe('releaseDetail', () => {
  it('tells editions apart by artist, format, year and country', () => {
    expect(releaseDetail(release)).toBe('Os Marés · LP, Album · 1978 · Portugal');
  });

  it('leaves out what the catalogue does not know', () => {
    expect(releaseDetail({ ...release, year: null, country: null })).toBe('Os Marés · LP, Album');
  });
});

describe('releaseLabel', () => {
  it('joins the label and the catalogue number', () => {
    expect(releaseLabel(release)).toBe('Onda Discos – OD 1042');
  });

  it('shows the one the catalogue has', () => {
    expect(releaseLabel({ ...release, catalogueNumber: null })).toBe('Onda Discos');
    expect(releaseLabel({ ...release, label: null })).toBe('OD 1042');
  });

  it('is empty for a release without either', () => {
    expect(releaseLabel({ ...release, label: null, catalogueNumber: null })).toBeNull();
  });
});

describe('record grades', () => {
  it('are offered best to worst, all eight', () => {
    expect(gradeOptions.map((option) => option.value)).toEqual(['M', 'NM', 'VG+', 'VG', 'G+', 'G', 'F', 'P']);
  });

  it('are explained in the seller\'s language', () => {
    expect(gradeDetail('VG+')).toBe('VG+ · marcas ligeiras, toca sem saltos.');
  });
});

describe('equipment conditions', () => {
  it('are offered best to worst, in words', () => {
    expect(equipmentConditionOptions()).toEqual([
      { value: 'new', label: 'Novo' },
      { value: 'like_new', label: 'Como novo' },
      { value: 'good', label: 'Bom' },
      { value: 'fair', label: 'Razoável' },
      { value: 'for_parts', label: 'Para peças' },
    ]);
  });

  it('are explained in the seller\'s language', () => {
    expect(equipmentConditionDetail('for_parts')).toBe('Para peças · não funciona ou precisa de reparação.');
  });
});
