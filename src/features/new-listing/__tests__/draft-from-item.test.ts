import {
  draftFromItem,
  draftItemFields,
  isWorthSaving,
  itemType,
  newDraft,
  withKind,
  withRelease,
} from '../draft';

import type { ListedItem } from '@/services/listings';

function savedItem(overrides: Partial<ListedItem> = {}): ListedItem {
  return {
    id: 'item-1',
    user_id: 'user-1',
    type: 'record',
    title: 'Noites de Lisboa',
    artist: 'Os Marés',
    discogs_release_id: 249504,
    format: 'LP, Album',
    release_year: 1978,
    media_condition: 'VG+',
    sleeve_condition: 'VG',
    equipment_condition: null,
    description: 'Capa com ligeiro desgaste.',
    price_minor: 2850,
    currency: 'EUR',
    accepts_offers: true,
    status: 'draft',
    created_at: '2026-11-01T10:00:00Z',
    updated_at: '2026-11-01T10:00:00Z',
    listings: [],
    photo: null,
    ...overrides,
  };
}

describe('draftFromItem', () => {
  it('keeps the item id, so saving again updates the same item', () => {
    expect(draftFromItem(savedItem()).id).toBe('item-1');
  });

  it('links the catalogue release the draft was saved with', () => {
    const draft = draftFromItem(savedItem());

    expect(draft.release).toMatchObject({
      id: 249504,
      title: 'Noites de Lisboa',
      artist: 'Os Marés',
      format: 'LP, Album',
      year: 1978,
    });
    expect(itemType(draft)).toBe('record');
  });

  it('turns back into the same item fields it was made from', () => {
    const item = savedItem();

    const { id, type, title, artist, discogs_release_id, format, release_year } = item;
    expect(draftItemFields(draftFromItem(item))).toMatchObject({
      id,
      type,
      title,
      artist,
      discogs_release_id,
      format,
      release_year,
      media_condition: 'VG+',
      sleeve_condition: 'VG',
      description: 'Capa com ligeiro desgaste.',
      price_minor: 2850,
      accepts_offers: true,
    });
  });

  it('writes the price the way the seller types it', () => {
    expect(draftFromItem(savedItem({ price_minor: 2850 })).priceText).toBe('28,50');
    expect(draftFromItem(savedItem({ price_minor: 2800 })).priceText).toBe('28');
    expect(draftFromItem(savedItem({ price_minor: null })).priceText).toBe('');
  });

  it('leaves the catalogue open for a record saved without a release', () => {
    const draft = draftFromItem(savedItem({ discogs_release_id: null, format: null, release_year: null }));

    expect(draft.release).toBeNull();
    expect(draft.name).toBe('Noites de Lisboa');
    expect(draft.kind).toBe('record');
    // Not "none of these": the seller can still pick an edition, which makes Discogs available.
    expect(draft.declinedCatalogue).toBe(false);
    expect(isWorthSaving(draft)).toBe(true);
  });

  it('carries the condition of equipment', () => {
    const draft = draftFromItem(
      savedItem({
        type: 'equipment',
        artist: null,
        discogs_release_id: null,
        format: null,
        release_year: null,
        media_condition: null,
        sleeve_condition: null,
        equipment_condition: 'good',
      }),
    );

    expect(draft.kind).toBe('equipment');
    expect(draft.equipmentCondition).toBe('good');
  });

  it('brings the photo along when it is one the seller added', () => {
    expect(draftFromItem(savedItem({ photo: { uri: 'file:///cover.jpg' } })).photos).toEqual([
      { uri: 'file:///cover.jpg' },
    ]);
  });

  it('has no photos when the item has none', () => {
    expect(draftFromItem(savedItem()).photos).toEqual([]);
  });

  it('keeps no marketplace switched off', () => {
    expect(draftFromItem(savedItem()).skippedMarketplaces).toEqual([]);
  });
});

describe('the artist of a draft', () => {
  const withoutRelease = { discogs_release_id: null, format: null, release_year: null } as const;

  it('is kept for a record saved without a catalogue edition', () => {
    const draft = draftFromItem(savedItem(withoutRelease));

    expect(draft.artist).toBe('Os Marés');
    expect(draftItemFields(draft).artist).toBe('Os Marés');
  });

  it('is decided by a catalogue edition once the seller picks one', () => {
    const draft = draftFromItem(savedItem(withoutRelease));

    const linked = withRelease(draft, {
      id: 1,
      title: 'Noites de Lisboa',
      artist: 'Marés',
      format: 'LP, Album',
      year: 1978,
      country: null,
      label: null,
      catalogueNumber: null,
    });

    expect(draftItemFields(linked).artist).toBe('Marés');
  });

  it('is empty for a draft that starts from nothing', () => {
    expect(draftItemFields(withKind(newDraft('item-2'), 'record')).artist).toBeNull();
  });
});
