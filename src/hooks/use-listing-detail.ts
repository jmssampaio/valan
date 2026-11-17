import { useCallback, useEffect, useState } from 'react';

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
  const [state, setState] = useState<ListingDetailState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    getListingDetail(itemId)
      .then((detail) => {
        if (ignore) return;
        setState(
          detail === null
            ? { status: 'notFound' }
            : { status: 'ready', detail, refreshing: false, refreshFailed: false },
        );
      })
      // The screen turns this into a message; the cause is the service's to report.
      .catch(() => {
        if (ignore) return;
        // A failed refresh keeps what is shown; only a first load has nothing to keep.
        setState((previous) =>
          previous.status === 'ready'
            ? { ...previous, refreshing: false, refreshFailed: true }
            : { status: 'error' },
        );
      });

    return () => {
      ignore = true;
    };
  }, [itemId, attempt]);

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
