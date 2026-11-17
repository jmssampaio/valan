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
  | { status: 'ready'; overview: ListingsOverview };

async function loadOverview(): Promise<ListingsOverview> {
  const [items, pendingOffers, sales] = await Promise.all([
    listItems(),
    countPendingOffers(),
    listSales(),
  ]);
  return { items, pendingOffers, sales };
}

/** Everything the listings screen shows, with a way to load it again after a failure. */
export function useListingsOverview(): ListingsOverviewState & { reload: () => void } {
  const [state, setState] = useState<ListingsOverviewState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    loadOverview()
      .then((overview) => {
        if (!ignore) setState({ status: 'ready', overview });
      })
      // The screen turns this into a message with a retry; the cause is the service's to report.
      .catch(() => {
        if (!ignore) setState({ status: 'error' });
      });

    return () => {
      ignore = true;
    };
  }, [attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }, []);

  return { ...state, reload };
}
