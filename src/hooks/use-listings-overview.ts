import { useLoadable } from './use-loadable';

import { listItems, type ListedItem } from '@/services/listings';
import { listSales } from '@/services/sales';
import type { Tables } from '@/types/database';

export type ListingsOverview = {
  items: ListedItem[];
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
  const [items, sales] = await Promise.all([listItems(), listSales()]);
  return { items, sales };
}

export type ListingsOverviewActions = {
  /** Starts over after a failed load, showing the loading state. */
  reload: () => void;
  /** Loads again while keeping what is on screen, for pull-to-refresh. */
  refresh: () => void;
};

/** Everything the listings screen shows, with ways to load it again. */
export function useListingsOverview(): ListingsOverviewState & ListingsOverviewActions {
  const loaded = useLoadable(loadOverview);
  const { reload, refresh } = loaded;

  if (loaded.status !== 'ready') return { status: loaded.status, reload, refresh };
  const { data, refreshing, refreshFailed } = loaded;
  return { status: 'ready', overview: data, refreshing, refreshFailed, reload, refresh };
}
