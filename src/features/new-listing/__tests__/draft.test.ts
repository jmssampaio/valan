import {
  addPhotos,
  canLeaveCatalogue,
  canLeaveCondition,
  draftItemFields,
  emptyDraft,
  isWorthSaving,
  MAX_PHOTOS,
  removePhoto,
  withType,
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

const record: ListingDraft = { ...emptyDraft, release };
const equipment: ListingDraft = { ...emptyDraft, type: 'equipment', title: 'Gira-discos Aurora' };

function photos(count: number) {
  return Array.from({ length: count }, (_, index) => ({ uri: `file:///photo-${index + 1}.jpg` }));
}

describe('a new draft', () => {
  it('starts as a record with nothing filled in', () => {
    expect(emptyDraft).toMatchObject({ type: 'record', release: null, photos: [], description: '' });
  });
});

describe('leaving the catalogue step', () => {
  it('needs a chosen release for a record', () => {
    expect(canLeaveCatalogue(emptyDraft)).toBe(false);
    expect(canLeaveCatalogue(record)).toBe(true);
  });

  it('needs a title for equipment', () => {
    expect(canLeaveCatalogue({ ...equipment, title: '   ' })).toBe(false);
    expect(canLeaveCatalogue(equipment)).toBe(true);
  });
});

describe('changing the item type', () => {
  it('drops the release and the grades when a record becomes equipment', () => {
    const changed = withType({ ...record, mediaCondition: 'VG+', sleeveCondition: 'VG' }, 'equipment');

    expect(changed).toMatchObject({
      type: 'equipment',
      release: null,
      mediaCondition: null,
      sleeveCondition: null,
    });
  });

  it('drops the title and the condition when equipment becomes a record', () => {
    const changed = withType({ ...equipment, equipmentCondition: 'good' }, 'record');

    expect(changed).toMatchObject({ type: 'record', title: '', equipmentCondition: null });
  });

  it('keeps the photos and the description', () => {
    const changed = withType({ ...record, photos: photos(2), description: 'First pressing' }, 'equipment');

    expect(changed.photos).toHaveLength(2);
    expect(changed.description).toBe('First pressing');
  });

  it('changes nothing when the type is the same', () => {
    expect(withType(record, 'record')).toBe(record);
  });
});

describe('leaving the condition step', () => {
  it('needs the condition of the record itself; the sleeve is optional', () => {
    expect(canLeaveCondition(record)).toBe(false);
    expect(canLeaveCondition({ ...record, sleeveCondition: 'VG' })).toBe(false);
    expect(canLeaveCondition({ ...record, mediaCondition: 'VG+' })).toBe(true);
  });

  it('needs the condition of the equipment', () => {
    expect(canLeaveCondition(equipment)).toBe(false);
    expect(canLeaveCondition({ ...equipment, equipmentCondition: 'fair' })).toBe(true);
  });
});

describe('photos', () => {
  it('are added after the ones already there', () => {
    const draft = addPhotos({ ...record, photos: photos(1) }, [{ uri: 'file:///new.jpg' }]);

    expect(draft.photos.map((photo) => photo.uri)).toEqual(['file:///photo-1.jpg', 'file:///new.jpg']);
  });

  it(`stop at ${MAX_PHOTOS}`, () => {
    const draft = addPhotos({ ...record, photos: photos(7) }, [
      { uri: 'file:///eighth.jpg' },
      { uri: 'file:///ninth.jpg' },
    ]);

    expect(draft.photos).toHaveLength(MAX_PHOTOS);
    expect(draft.photos.at(-1)?.uri).toBe('file:///eighth.jpg');
  });

  it('are not added twice', () => {
    const draft = addPhotos({ ...record, photos: photos(2) }, [{ uri: 'file:///photo-1.jpg' }]);

    expect(draft.photos).toHaveLength(2);
  });

  it('keep their order when one is removed', () => {
    const draft = removePhoto({ ...record, photos: photos(3) }, 'file:///photo-2.jpg');

    expect(draft.photos.map((photo) => photo.uri)).toEqual(['file:///photo-1.jpg', 'file:///photo-3.jpg']);
  });
});

describe('saving a draft', () => {
  it('is not worth it while nothing identifies the item', () => {
    expect(isWorthSaving(emptyDraft)).toBe(false);
    expect(isWorthSaving({ ...emptyDraft, description: 'Some notes', photos: photos(1) })).toBe(false);
    expect(isWorthSaving(record)).toBe(true);
    expect(isWorthSaving(equipment)).toBe(true);
  });

  it('stores a record with the details of its release', () => {
    const fields = draftItemFields({
      ...record,
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

  it('stores equipment with its title and condition and none of the record fields', () => {
    const fields = draftItemFields({ ...equipment, title: ' Gira-discos Aurora ', equipmentCondition: 'good' });

    expect(fields).toEqual({
      type: 'equipment',
      title: 'Gira-discos Aurora',
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
    expect(draftItemFields(record)).not.toHaveProperty('status');
  });
});
