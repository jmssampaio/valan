import { useLoadable } from './use-loadable';

import { listOffers, type OfferRow } from '@/services/offers';

export type OffersState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      offers: OfferRow[];
      /** A refresh is under way; the last offers stay on screen meanwhile. */
      refreshing: boolean;
      /** The last refresh failed, so what is shown may be out of date. */
      refreshFailed: boolean;
    };

export type OffersActions = {
  /** Starts over after a failed load, showing the loading state. */
  reload: () => void;
  /** Loads again while keeping what is on screen, such as after an answer or on pull-to-refresh. */
  refresh: () => void;
};

/** Every offer the seller has, with ways to load them again. */
export function useOffers(): OffersState & OffersActions {
  const loaded = useLoadable(listOffers);
  const { reload, refresh } = loaded;

  if (loaded.status !== 'ready') return { status: loaded.status, reload, refresh };
  const { data, refreshing, refreshFailed } = loaded;
  return { status: 'ready', offers: data, refreshing, refreshFailed, reload, refresh };
}
