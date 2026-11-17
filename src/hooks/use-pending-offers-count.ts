import { useEffect, useState } from 'react';

import { countPendingOffers } from '@/services/offers';

/** How many offers wait for an answer; zero until the count is known. */
export function usePendingOffersCount(): number {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let ignore = false;

    countPendingOffers()
      .then((pending) => {
        if (!ignore) setCount(pending);
      })
      // The badge is a hint: without a count the tab simply shows none. The offers
      // screen itself reports the failure when it loads.
      .catch(() => {
        if (!ignore) setCount(0);
      });

    return () => {
      ignore = true;
    };
  }, []);

  return count;
}
