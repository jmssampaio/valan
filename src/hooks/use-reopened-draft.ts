import { useCallback, useEffect, useState } from 'react';

import { draftFromItem, type ListingDraft } from '@/features/new-listing/draft';
import { getListingDetail } from '@/services/listing-detail';

export type ReopenedDraftState =
  | { status: 'loading' }
  | { status: 'error' }
  /** Nothing to carry on with: the item is gone, or is no longer a draft. Trying again cannot help. */
  | { status: 'unavailable' }
  | { status: 'ready'; draft: ListingDraft };

/** Loads a saved draft to carry on with, with a way to load again after a failure. */
export function useReopenedDraft(itemId: string): ReopenedDraftState & { reload: () => void } {
  const [state, setState] = useState<ReopenedDraftState>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    getListingDetail(itemId)
      .then((detail) => {
        if (ignore) return;
        setState(
          detail?.item.status === 'draft'
            ? { status: 'ready', draft: draftFromItem(detail.item, detail.photos) }
            : { status: 'unavailable' },
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

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }, []);

  return { ...state, reload };
}
