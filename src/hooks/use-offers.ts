import { useCallback, useEffect, useState } from 'react';

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
  const [state, setState] = useState<OffersState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    listOffers()
      .then((offers) => {
        if (!ignore) setState({ status: 'ready', offers, refreshing: false, refreshFailed: false });
      })
      // The screen turns this into a message; the cause is the service's to report.
      .catch(() => {
        if (ignore) return;
        // A failed refresh keeps the offers shown; only a first load has nothing to keep.
        setState((previous) =>
          previous.status === 'ready'
            ? { ...previous, refreshing: false, refreshFailed: true }
            : { status: 'error' },
        );
      });

    return () => {
      ignore = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }, []);

  const refresh = useCallback(() => {
    setState((previous) =>
      previous.status === 'ready' ? { ...previous, refreshing: true } : previous,
    );
    setAttempt((previous) => previous + 1);
  }, []);

  return { ...state, reload, refresh };
}
