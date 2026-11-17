import type { CatalogueRelease } from '@/services/catalogue';
import type { DraftItemFields } from '@/services/drafts';
import type { Enums } from '@/types/database';

export const MAX_PHOTOS = 8;

export type DraftPhoto = { uri: string };

/** What the seller has entered so far, across every step of the new-listing flow. */
export type ListingDraft = {
  type: Enums<'item_type'>;
  /** Records only: the catalogue release the record is listed against. */
  release: CatalogueRelease | null;
  /** Equipment only: a record takes its title from the release. */
  title: string;
  mediaCondition: Enums<'record_condition'> | null;
  sleeveCondition: Enums<'record_condition'> | null;
  equipmentCondition: Enums<'equipment_condition'> | null;
  photos: readonly DraftPhoto[];
  description: string;
};

export const emptyDraft: ListingDraft = {
  type: 'record',
  release: null,
  title: '',
  mediaCondition: null,
  sleeveCondition: null,
  equipmentCondition: null,
  photos: [],
  description: '',
};

/**
 * Each type keeps its own answers, so switching by mistake and back loses nothing.
 * Only the current type's answers count and are saved (see draftItemFields).
 */
export function withType(draft: ListingDraft, type: ListingDraft['type']): ListingDraft {
  return draft.type === type ? draft : { ...draft, type };
}

function identifiesItem(draft: ListingDraft): boolean {
  return draft.type === 'record' ? draft.release !== null : draft.title.trim() !== '';
}

export function canLeaveCatalogue(draft: ListingDraft): boolean {
  return identifiesItem(draft);
}

/** A record can be sold without its sleeve, so only the condition of the item itself is needed. */
export function canLeaveCondition(draft: ListingDraft): boolean {
  return draft.type === 'record' ? draft.mediaCondition !== null : draft.equipmentCondition !== null;
}

export function addPhotos(draft: ListingDraft, photos: readonly DraftPhoto[]): ListingDraft {
  const known = new Set(draft.photos.map((photo) => photo.uri));
  const added = photos.filter((photo) => !known.has(photo.uri));

  return { ...draft, photos: [...draft.photos, ...added].slice(0, MAX_PHOTOS) };
}

export function removePhoto(draft: ListingDraft, uri: string): ListingDraft {
  return { ...draft, photos: draft.photos.filter((photo) => photo.uri !== uri) };
}

/** A draft without a release or a title would be a nameless row in the seller's list. */
export function isWorthSaving(draft: ListingDraft): boolean {
  return identifiesItem(draft);
}

export function draftItemFields(draft: ListingDraft): DraftItemFields {
  const isRecord = draft.type === 'record';
  const release = isRecord ? draft.release : null;

  return {
    type: draft.type,
    title: isRecord ? (release?.title ?? '') : draft.title.trim(),
    artist: release?.artist ?? null,
    discogs_release_id: release?.id ?? null,
    format: release?.format ?? null,
    release_year: release?.year ?? null,
    media_condition: isRecord ? draft.mediaCondition : null,
    sleeve_condition: isRecord ? draft.sleeveCondition : null,
    equipment_condition: isRecord ? null : draft.equipmentCondition,
    description: draft.description.trim() || null,
  };
}
