import {
  addPhotos,
  canLeaveCatalogue,
  canLeaveCondition,
  catalogueStep,
  draftItemFields,
  emptyDraft,
  isWorthSaving,
  itemType,
  marketplaceReach,
  MAX_PHOTOS,
  removePhoto,
  withKind,
  withName,
  withoutCatalogue,
  withRelease,
  type ListingDraft,
} from '../draft';

import type { CatalogueRelease } from '@/services/catalogue';

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

const named: ListingDraft = withName(emptyDraft, 'noites de lis');
/** A record chosen from the catalogue. */
const linked: ListingDraft = withRelease(named, release);
/** A record the catalogue does not have. */
const looseRecord: ListingDraft = withKind(withoutCatalogue(named), 'record');
/** Something that is not a record. */
const turntable: ListingDraft = withKind(
  withoutCatalogue(withName(emptyDraft, 'Gira-discos Aurora T-200')),
  'equipment',
);

function photos(count: number) {
  return Array.from({ length: count }, (_, index) => ({ uri: `file:///photo-${index + 1}.jpg` }));
}

describe('a new draft', () => {
  it('starts with nothing filled in and no item type', () => {
    expect(emptyDraft).toMatchObject({ name: '', release: null, kind: null, photos: [], description: '' });
    expect(itemType(emptyDraft)).toBeNull();
  });
});

describe('what the item is', () => {
  it('is a record once an edition is chosen from the catalogue', () => {
    expect(itemType(linked)).toBe('record');
  });

  it('is what the seller says when it is not in the catalogue', () => {
    expect(itemType(looseRecord)).toBe('record');
    expect(itemType(turntable)).toBe('equipment');
  });

  it('is unknown without the catalogue until the seller says', () => {
    expect(itemType(withoutCatalogue(named))).toBeNull();
  });

  it('is a record again when an edition is chosen after saying "another item"', () => {
    expect(itemType(withRelease(turntable, release))).toBe('record');
  });
});

describe('the catalogue step', () => {
  it('waits for a name', () => {
    expect(catalogueStep(emptyDraft, 'idle')).toEqual({ state: 'naming' });
  });

  it('waits while the catalogue is searched', () => {
    expect(catalogueStep(named, 'loading')).toEqual({ state: 'searching' });
  });

  it('asks the seller to choose when editions are found', () => {
    expect(catalogueStep(named, 'found')).toEqual({ state: 'choosing' });
  });

  it('links the listing to the chosen edition', () => {
    expect(catalogueStep(linked, 'found')).toEqual({ state: 'linked' });
  });

  it('keeps the chosen edition whatever a later search says', () => {
    expect(catalogueStep(linked, 'none')).toEqual({ state: 'linked' });
    expect(catalogueStep(linked, 'error')).toEqual({ state: 'linked' });
    expect(catalogueStep(linked, 'loading')).toEqual({ state: 'linked' });
  });

  it('goes on without the catalogue when the seller says it is none of the editions', () => {
    expect(catalogueStep(withoutCatalogue(named), 'found')).toEqual({ state: 'unlinked', why: 'declined' });
  });

  it('goes on without the catalogue when no edition is found', () => {
    expect(catalogueStep(named, 'none')).toEqual({ state: 'unlinked', why: 'none' });
  });

  it('never blocks: a failed search goes on without the catalogue', () => {
    expect(catalogueStep(named, 'error')).toEqual({ state: 'unlinked', why: 'failed' });
  });

  it('asks again after the name changes', () => {
    const renamed = withName(withoutCatalogue(named), 'noites de lisboa');

    expect(catalogueStep(renamed, 'found')).toEqual({ state: 'choosing' });
  });

  it('chooses an edition after having said it was none of them', () => {
    const changedMind = withRelease(withoutCatalogue(named), release);

    expect(catalogueStep(changedMind, 'found')).toEqual({ state: 'linked' });
  });
});

describe('leaving the catalogue step', () => {
  it('is possible with a chosen edition', () => {
    expect(canLeaveCatalogue(linked, 'found')).toBe(true);
  });

  it('is not possible while editions are offered and none is chosen or declined', () => {
    expect(canLeaveCatalogue(named, 'found')).toBe(false);
  });

  it('is not possible while the search is running or nothing is typed', () => {
    expect(canLeaveCatalogue(named, 'loading')).toBe(false);
    expect(canLeaveCatalogue(emptyDraft, 'idle')).toBe(false);
  });

  it('needs the kind of item when going on without the catalogue', () => {
    expect(canLeaveCatalogue(withoutCatalogue(named), 'found')).toBe(false);
    expect(canLeaveCatalogue(looseRecord, 'found')).toBe(true);
    expect(canLeaveCatalogue(turntable, 'none')).toBe(true);
  });

  it('is possible without the catalogue when the search failed', () => {
    expect(canLeaveCatalogue(withKind(named, 'record'), 'error')).toBe(true);
  });
});

describe('where a listing can go', () => {
  it('reaches Discogs and eBay with a catalogue edition', () => {
    expect(marketplaceReach(linked)).toEqual([
      { marketplace: 'discogs', available: true, reason: null },
      { marketplace: 'ebay', available: true, reason: null },
    ]);
  });

  it('still reaches eBay without one, and says why Discogs is left out', () => {
    expect(marketplaceReach(looseRecord)).toEqual([
      { marketplace: 'discogs', available: false, reason: 'noCatalogueRelease' },
      { marketplace: 'ebay', available: true, reason: null },
    ]);
    expect(marketplaceReach(turntable)).toEqual(marketplaceReach(looseRecord));
  });
});

describe('changing the kind of item', () => {
  // Switching by mistake must not cost the seller what they entered: each kind keeps its own
  // answers, and only the current kind's are saved (see "saving a draft").
  it('keeps what was entered for the other kind, so switching back restores it', () => {
    const graded = { ...looseRecord, mediaCondition: 'VG+', sleeveCondition: 'VG' } as const;

    expect(withKind(withKind(graded, 'equipment'), 'record')).toEqual(graded);
  });
});

describe('leaving the condition step', () => {
  it('needs the condition of the record itself; the sleeve is optional', () => {
    expect(canLeaveCondition(linked)).toBe(false);
    expect(canLeaveCondition({ ...linked, sleeveCondition: 'VG' })).toBe(false);
    expect(canLeaveCondition({ ...linked, mediaCondition: 'VG+' })).toBe(true);
    expect(canLeaveCondition({ ...looseRecord, mediaCondition: 'VG+' })).toBe(true);
  });

  it('needs the condition of another kind of item on its own scale', () => {
    expect(canLeaveCondition({ ...turntable, mediaCondition: 'VG+' })).toBe(false);
    expect(canLeaveCondition({ ...turntable, equipmentCondition: 'fair' })).toBe(true);
  });
});

describe('photos', () => {
  it('are added after the ones already there', () => {
    const draft = addPhotos({ ...linked, photos: photos(1) }, [{ uri: 'file:///new.jpg' }]);

    expect(draft.photos.map((photo) => photo.uri)).toEqual(['file:///photo-1.jpg', 'file:///new.jpg']);
  });

  it(`stop at ${MAX_PHOTOS}`, () => {
    const draft = addPhotos({ ...linked, photos: photos(7) }, [
      { uri: 'file:///eighth.jpg' },
      { uri: 'file:///ninth.jpg' },
    ]);

    expect(draft.photos).toHaveLength(MAX_PHOTOS);
    expect(draft.photos.at(-1)?.uri).toBe('file:///eighth.jpg');
  });

  it('are not added twice', () => {
    const draft = addPhotos({ ...linked, photos: photos(2) }, [{ uri: 'file:///photo-1.jpg' }]);

    expect(draft.photos).toHaveLength(2);
  });

  it('keep their order when one is removed', () => {
    const draft = removePhoto({ ...linked, photos: photos(3) }, 'file:///photo-2.jpg');

    expect(draft.photos.map((photo) => photo.uri)).toEqual(['file:///photo-1.jpg', 'file:///photo-3.jpg']);
  });
});

describe('saving a draft', () => {
  it('is not worth it until the item has a name and a kind', () => {
    expect(isWorthSaving(emptyDraft)).toBe(false);
    expect(isWorthSaving(named)).toBe(false);
    expect(isWorthSaving(withKind(withoutCatalogue(withName(emptyDraft, '  ')), 'record'))).toBe(false);
    expect(isWorthSaving(linked)).toBe(true);
    expect(isWorthSaving(looseRecord)).toBe(true);
    expect(isWorthSaving(turntable)).toBe(true);
  });

  it('stores a catalogue record under the title of its edition, with its details', () => {
    const fields = draftItemFields({
      ...linked,
      mediaCondition: 'VG+',
      sleeveCondition: 'VG',
      description: '  First pressing.  ',
    });

    expect(fields).toEqual({
      type: 'record',
      title: 'Noites de Lisboa',
      artist: 'Os Marés',
      discogs_release_id: 249504,
      format: 'LP, Album',
      release_year: 1978,
      media_condition: 'VG+',
      sleeve_condition: 'VG',
      equipment_condition: null,
      description: 'First pressing.',
    });
  });

  it('stores a record that is not in the catalogue under the name the seller typed', () => {
    const fields = draftItemFields({ ...looseRecord, name: ' Noites de Lisboa (promo) ', mediaCondition: 'G+' });

    expect(fields).toEqual({
      type: 'record',
      title: 'Noites de Lisboa (promo)',
      artist: null,
      discogs_release_id: null,
      format: null,
      release_year: null,
      media_condition: 'G+',
      sleeve_condition: null,
      equipment_condition: null,
      description: null,
    });
  });

  it('stores another kind of item with its own condition and none of the record fields', () => {
    const fields = draftItemFields({ ...turntable, mediaCondition: 'VG+', equipmentCondition: 'good' });

    expect(fields).toEqual({
      type: 'equipment',
      title: 'Gira-discos Aurora T-200',
      artist: null,
      discogs_release_id: null,
      format: null,
      release_year: null,
      media_condition: null,
      sleeve_condition: null,
      equipment_condition: 'good',
      description: null,
    });
  });

  it('never carries a status: the server decides it', () => {
    expect(draftItemFields(linked)).not.toHaveProperty('status');
  });
});
