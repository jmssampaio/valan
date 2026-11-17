import { useCallback } from 'react';

import { useLoadable } from './use-loadable';

import { getListingDetail, type ListingDetail } from '@/services/listing-detail';

export type ListingDetailState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'notFound' }
  | {
      status: 'ready';
      detail: ListingDetail;
      /** A refresh is under way; the last detail stays on screen meanwhile. */
      refreshing: boolean;
      /** The last refresh failed, so what is shown may be out of date. */
      refreshFailed: boolean;
    };

export type ListingDetailActions = {
  /** Starts over after a failed load, showing the loading state. */
  reload: () => void;
  /** Loads again while keeping what is on screen, such as after pausing or coming back. */
  refresh: () => void;
};

/** Everything the detail screen shows about one item, with ways to load it again. */
export function useListingDetail(itemId: string): ListingDetailState & ListingDetailActions {
  const load = useCallback(() => getListingDetail(itemId), [itemId]);
  const loaded = useLoadable(load);
  const { reload, refresh } = loaded;

  if (loaded.status !== 'ready') return { status: loaded.status, reload, refresh };
  // The service answers null for an item that does not exist, or that is not the seller's.
  if (loaded.data === null) return { status: 'notFound', reload, refresh };

  const { data, refreshing, refreshFailed } = loaded;
  return { status: 'ready', detail: data, refreshing, refreshFailed, reload, refresh };
}
