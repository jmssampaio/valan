import { useCallback, useEffect, useState } from 'react';

import { draftFromItem, type ListingDraft } from '@/features/new-listing/draft';
import { getListingDetail } from '@/services/listing-detail';

export type ReopenedDraftState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; draft: ListingDraft };

/**
 * Loads a saved draft to carry on with. Anything that is not a draft any more, or no longer
 * exists, cannot be reopened: it counts as an error, because there is nothing to carry on with.
 */
export function useReopenedDraft(itemId: string): ReopenedDraftState & { retry: () => void } {
  const [state, setState] = useState<ReopenedDraftState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    getListingDetail(itemId)
      .then((detail) => {
        if (ignore) return;
        setState(
          detail?.item.status === 'draft'
            ? { status: 'ready', draft: draftFromItem(detail.item) }
            : { status: 'error' },
        );
      })
      // The screen turns this into a message with a retry; the cause is the service's to report.
      .catch(() => {
        if (!ignore) setState({ status: 'error' });
      });

    return () => {
      ignore = true;
    };
  }, [itemId, attempt]);

  const retry = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }, []);

  return { ...state, retry };
}
