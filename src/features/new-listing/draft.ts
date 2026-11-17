import type { CatalogueRelease } from '@/services/catalogue';
import type { DraftItemFields } from '@/services/drafts';
import type { MarketplaceInfo } from '@/services/marketplaces';
import type { Enums } from '@/types/database';

export const MAX_PHOTOS = 8;

export type DraftPhoto = { uri: string };
export type ItemKind = Enums<'item_type'>;

/** What the seller has entered so far, across every step of the new-listing flow. */
export type ListingDraft = {
  /** What the seller typed in "What are you selling?". */
  name: string;
  /** The catalogue edition the seller chose. With one, the item is a record that Discogs accepts. */
  release: CatalogueRelease | null;
  /** The seller looked at the editions found and said the item is none of them. */
  declinedCatalogue: boolean;
  /** Asked only when the listing goes on without the catalogue; it picks the condition scale. */
  kind: ItemKind | null;
  mediaCondition: Enums<'record_condition'> | null;
  sleeveCondition: Enums<'record_condition'> | null;
  equipmentCondition: Enums<'equipment_condition'> | null;
  photos: readonly DraftPhoto[];
  description: string;
};

export const emptyDraft: ListingDraft = {
  name: '',
  release: null,
  declinedCatalogue: false,
  kind: null,
  mediaCondition: null,
  sleeveCondition: null,
  equipmentCondition: null,
  photos: [],
  description: '',
};

/** A new name may match other editions, so an earlier "none of these" no longer stands. */
export function withName(draft: ListingDraft, name: string): ListingDraft {
  return name === draft.name ? draft : { ...draft, name, declinedCatalogue: false };
}

export function withRelease(draft: ListingDraft, release: CatalogueRelease): ListingDraft {
  return { ...draft, release, declinedCatalogue: false };
}

export function withoutCatalogue(draft: ListingDraft): ListingDraft {
  return { ...draft, release: null, declinedCatalogue: true };
}

/**
 * Each kind keeps its own answers, so switching by mistake and back loses nothing.
 * Only the current kind's answers count and are saved (see draftItemFields).
 */
export function withKind(draft: ListingDraft, kind: ItemKind): ListingDraft {
  return { ...draft, kind };
}

/** A catalogue edition is always a record; otherwise the item is what the seller says it is. */
export function itemType(draft: ListingDraft): ItemKind | null {
  return draft.release ? 'record' : draft.kind;
}

/** What the catalogue search has to say about the name typed so far. */
export type CatalogueSearchOutcome = 'idle' | 'loading' | 'found' | 'none' | 'error';

export type CatalogueStep =
  | { state: 'naming' }
  | { state: 'searching' }
  /** Editions are on offer: the seller picks one or says it is none of them. */
  | { state: 'choosing' }
  | { state: 'linked' }
  /** The listing goes on without the catalogue. It is never a dead end. */
  | { state: 'unlinked'; why: 'declined' | 'none' | 'failed' };

export function catalogueStep(draft: ListingDraft, search: CatalogueSearchOutcome): CatalogueStep {
  if (draft.release) return { state: 'linked' };

  switch (search) {
    case 'idle':
      return { state: 'naming' };
    case 'loading':
      return { state: 'searching' };
    case 'none':
      return { state: 'unlinked', why: 'none' };
    case 'error':
      return { state: 'unlinked', why: 'failed' };
    case 'found':
      return draft.declinedCatalogue ? { state: 'unlinked', why: 'declined' } : { state: 'choosing' };
  }
}

function hasName(draft: ListingDraft): boolean {
  return draft.name.trim() !== '';
}

export function canLeaveCatalogue(draft: ListingDraft, search: CatalogueSearchOutcome): boolean {
  const step = catalogueStep(draft, search);
  if (step.state === 'linked') return true;
  return step.state === 'unlinked' && hasName(draft) && draft.kind !== null;
}

export type MarketplaceReach = {
  marketplace: MarketplaceInfo;
  available: boolean;
  /** Why the listing cannot go there; the app always says so. */
  reason: 'noCatalogueRelease' | 'itemTypeNotListed' | null;
};

function exclusionReason(
  draft: ListingDraft,
  { capabilities }: MarketplaceInfo,
): MarketplaceReach['reason'] {
  if (capabilities.requiresCatalogueRelease && draft.release === null) return 'noCatalogueRelease';

  // Until the seller says what the item is, its kind rules nothing out.
  const type = itemType(draft);
  if (type !== null && !capabilities.itemTypes.includes(type)) return 'itemTypeNotListed';

  return null;
}

/**
 * Where this listing can be published, from what each marketplace declares it can list.
 * A marketplace's requirements may leave it out, but they never stop the seller from
 * listing on the others.
 */
export function marketplaceReach(
  draft: ListingDraft,
  marketplaces: readonly MarketplaceInfo[],
): MarketplaceReach[] {
  return marketplaces.map((marketplace) => {
    const reason = exclusionReason(draft, marketplace);
    return { marketplace, available: reason === null, reason };
  });
}

/** A record can be sold without its sleeve, so only the condition of the item itself is needed. */
export function canLeaveCondition(draft: ListingDraft): boolean {
  return itemType(draft) === 'record'
    ? draft.mediaCondition !== null
    : draft.equipmentCondition !== null;
}

export function addPhotos(draft: ListingDraft, photos: readonly DraftPhoto[]): ListingDraft {
  const known = new Set(draft.photos.map((photo) => photo.uri));
  const added = photos.filter((photo) => !known.has(photo.uri));

  return { ...draft, photos: [...draft.photos, ...added].slice(0, MAX_PHOTOS) };
}

export function removePhoto(draft: ListingDraft, uri: string): ListingDraft {
  return { ...draft, photos: draft.photos.filter((photo) => photo.uri !== uri) };
}

/** An item is stored with a title and a type, so a draft without either cannot be a row yet. */
export function isWorthSaving(draft: ListingDraft): boolean {
  return draft.release !== null || (hasName(draft) && draft.kind !== null);
}

export function draftItemFields(draft: ListingDraft): DraftItemFields {
  const type = itemType(draft);
  if (type === null) {
    throw new Error('A draft cannot be saved before the kind of item is known.');
  }
  const isRecord = type === 'record';
  const { release } = draft;

  return {
    type,
    title: release?.title ?? draft.name.trim(),
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
