import {
  equipmentConditionDetail,
  equipmentConditionOptions,
  gradeDetail,
  gradeOptions,
  mediaConditionLabel,
  reachedNames,
  reachNotice,
  releaseDetail,
  releaseLabel,
} from '../labels';

import type { MarketplaceReach } from '../draft';

import type { CatalogueRelease } from '@/services/catalogue';
import type { MarketplaceInfo } from '@/services/marketplaces';

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

describe('mediaConditionLabel', () => {
  it.each([
    ['LP, Album', 'Estado do disco'],
    ['2×LP, Album, Reissue', 'Estado do disco'],
    ['7", Single', 'Estado do disco'],
    ['12", Maxi-Single', 'Estado do disco'],
    ['Vinyl', 'Estado do disco'],
    ['CD', 'Estado do CD'],
    ['CD, Album', 'Estado do CD'],
    ['2×CD, Compilation', 'Estado do CD'],
    ['Cassette, Album', 'Estado da cassete'],
    ['Cass, Single', 'Estado da cassete'],
  ])('names the carrier of a "%s" release: %s', (format, label) => {
    expect(mediaConditionLabel(format)).toBe(label);
  });

  it('speaks of the medium when the format is unknown or not one of the three', () => {
    expect(mediaConditionLabel(null)).toBe('Estado do suporte');
    expect(mediaConditionLabel('Reel-To-Reel')).toBe('Estado do suporte');
  });
});

describe('what the seller is told about where the listing goes', () => {
  const info = (name: string): MarketplaceInfo => ({
    id: name.toLowerCase(),
    name,
    capabilities: { itemTypes: ['record', 'equipment'], requiresCatalogueRelease: false },
  });
  const open = (name: string): MarketplaceReach => ({ marketplace: info(name), available: true, reason: null });
  const shut = (name: string, reason: MarketplaceReach['reason'] = 'noCatalogueRelease'): MarketplaceReach => ({
    marketplace: info(name),
    available: false,
    reason,
  });

  it('is nothing when every marketplace is reached', () => {
    expect(reachNotice([open('Discogs'), open('eBay')], 'declined')).toBeNull();
  });

  it('says "only" the one marketplace that is left', () => {
    const notice = reachNotice([shut('Discogs'), open('eBay')], 'declined');

    expect(notice).toEqual({
      tag: 'Só eBay',
      title: 'Este anúncio não é publicado em Discogs',
      body: 'Discogs só aceita discos que existam no seu catálogo. O anúncio é publicado em eBay com o nome que escreveste.',
    });
  });

  it('says "without" the excluded marketplace when two or more are left', () => {
    const notice = reachNotice([shut('Discogs'), open('eBay'), open('Reverb')], 'none');

    expect(notice).toEqual({
      tag: 'Sem Discogs',
      title: 'Este anúncio não é publicado em Discogs',
      body: 'Discogs só aceita discos que existam no seu catálogo. O anúncio é publicado em eBay, Reverb com o nome que escreveste.',
    });
  });

  it('gives each excluded marketplace its own reason', () => {
    const notice = reachNotice(
      [shut('Discogs'), shut('VinylHub', 'itemTypeNotListed'), open('eBay'), open('Reverb')],
      'none',
    );

    expect(notice?.tag).toBe('Sem Discogs, VinylHub');
    expect(notice?.body).toContain('Discogs só aceita discos que existam no seu catálogo.');
    expect(notice?.body).toContain('VinylHub não aceita este tipo de artigo.');
  });

  it('offers another search when the catalogue could not be reached', () => {
    const notice = reachNotice([shut('Discogs'), open('eBay')], 'failed');

    expect(notice?.body).toBe(
      'Sem a edição do catálogo, o anúncio só pode ir para eBay. Procura de novo para o publicares também em Discogs, ou continua assim.',
    );
  });

  it('lists every marketplace the listing reaches in the footer', () => {
    expect(reachedNames([shut('Discogs'), open('eBay'), open('Reverb')])).toEqual(['eBay', 'Reverb']);
  });
});
