import { useCallback, useEffect, useState } from 'react';

import { listItems, type ListedItem } from '@/services/listings';
import { countPendingOffers } from '@/services/offers';
import { listSales } from '@/services/sales';
import type { Tables } from '@/types/database';

export type ListingsOverview = {
  items: ListedItem[];
  pendingOffers: number;
  sales: Tables<'sales'>[];
};

export type ListingsOverviewState =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      overview: ListingsOverview;
      /** A refresh is under way; the last overview stays on screen meanwhile. */
      refreshing: boolean;
      /** The last refresh failed, so the overview may be out of date. */
      refreshFailed: boolean;
    };

async function loadOverview(): Promise<ListingsOverview> {
  const [items, pendingOffers, sales] = await Promise.all([
    listItems(),
    countPendingOffers(),
    listSales(),
  ]);
  return { items, pendingOffers, sales };
}

export type ListingsOverviewActions = {
  /** Starts over after a failed load, showing the loading state. */
  reload: () => void;
  /** Loads again while keeping what is on screen, for pull-to-refresh. */
  refresh: () => void;
};

/** Everything the listings screen shows, with ways to load it again. */
export function useListingsOverview(): ListingsOverviewState & ListingsOverviewActions {
  const [state, setState] = useState<ListingsOverviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    loadOverview()
      .then((overview) => {
        if (!ignore) {
          setState({ status: 'ready', overview, refreshing: false, refreshFailed: false });
        }
      })
      // The screen turns this into a message; the cause is the service's to report.
      .catch(() => {
        if (ignore) return;
        // A failed refresh keeps the listings already shown; only a first load has nothing to keep.
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
