import { createContext, use, useCallback, useEffect, useState, type ReactNode } from 'react';

import { countPendingOffers } from '@/services/offers';

type PendingOffers = {
  /** How many offers wait for an answer; null while that is not known. */
  count: number | null;
  /** Counts again, for a refresh. The last count stays until the new one arrives. */
  reload: () => void;
};

const PendingOffersContext = createContext<PendingOffers | null>(null);

/**
 * The one place the pending offers are counted. The tab badge and the listings summary both
 * read it, so they can never show different numbers.
 */
export function PendingOffersProvider({ children }: { children: ReactNode }) {
  const [count, setCount] = useState<number | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    countPendingOffers()
      .then((pending) => {
        if (!ignore) setCount(pending);
      })
      // The count is a hint beside the tab and in the summary: without a new one the last
      // stays. The offers screen itself reports the failure when it loads.
      .catch(() => {});

    return () => {
      ignore = true;
    };
  }, [attempt]);

  const reload = useCallback(() => setAttempt((previous) => previous + 1), []);

  return <PendingOffersContext value={{ count, reload }}>{children}</PendingOffersContext>;
}

export function usePendingOffers(): PendingOffers {
  const value = use(PendingOffersContext);
  if (value === null) {
    throw new Error('usePendingOffers must be used inside the tabs.');
  }
  return value;
}
