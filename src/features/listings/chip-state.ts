import type { ChipState } from '@/components/platform-chip';
import type { Enums } from '@/types/database';

const stateByStatus: Record<Enums<'listing_status'>, ChipState> = {
  published: 'live',
  // Not in the spec's chip; CLAUDE.md keeps "a publicar" while the marketplace has not answered.
  pending: 'pending',
  paused: 'paused',
  error: 'error',
  removed: 'off',
};

/**
 * The state of an item's chip for one marketplace. Once the item has sold, that wins over what
 * the listing says: sold where it sold, and off everywhere else, where it is being taken down.
 */
export function chipState(
  listing: { marketplace: string; status: Enums<'listing_status'> },
  soldOn: string | null = null,
): ChipState {
  if (soldOn !== null) return soldOn === listing.marketplace ? 'sold' : 'off';
  return stateByStatus[listing.status];
}
