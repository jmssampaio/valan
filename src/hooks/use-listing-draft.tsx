import { createContext, use, useRef, useState, type ReactNode } from 'react';

import { draftItemFields, newDraft, type ListingDraft } from '@/features/new-listing/draft';
import { newItemId } from '@/services/ids';
import {
  publishItem,
  retryListing,
  type ListingOutcome,
  type PublishResult,
} from '@/services/publishing';

export type Publication =
  | { status: 'idle' }
  | { status: 'publishing' }
  /** The request itself failed, so nothing was published anywhere. */
  | { status: 'failed'; marketplaces: readonly string[] }
  | {
      status: 'done';
      result: PublishResult;
      /** Marketplaces being tried again, by id. */
      retrying: readonly string[];
    };

type NewListingContextValue = {
  draft: ListingDraft;
  /** Replaces the draft with the result of a change, such as one of the functions in draft.ts. */
  change: (change: (draft: ListingDraft) => ListingDraft) => void;
  publication: Publication;
  /** Sends the draft to the chosen marketplaces, by id. */
  publish: (marketplaces: readonly string[]) => void;
  /** Tries again on one marketplace that refused the listing. */
  retry: (marketplace: string) => void;
  /** Clears everything for another listing. */
  startOver: () => void;
};

const NewListingContext = createContext<NewListingContextValue | null>(null);

/** Holds the one draft every step of the new-listing flow shares, and what became of it. */
export function ListingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(() => newDraft(newItemId()));
  const [publication, setPublication] = useState<Publication>({ status: 'idle' });
  // What is on its way right now. Refs, because two presses can land before the next render
  // and each must see what the other started.
  const isPublishing = useRef(false);
  const retriesInFlight = useRef(new Set<string>());

  function publish(marketplaces: readonly string[]) {
    if (isPublishing.current) return;
    isPublishing.current = true;

    setPublication({ status: 'publishing' });
    publishItem({ item: draftItemFields(draft), photos: draft.photos, marketplaces })
      .then((result) => setPublication({ status: 'done', result, retrying: [] }))
      // The result screen says nothing was published and offers to try again.
      .catch(() => setPublication({ status: 'failed', marketplaces }))
      .finally(() => {
        isPublishing.current = false;
      });
  }

  function retry(marketplace: string) {
    if (publication.status !== 'done') return;
    const { itemId } = publication.result;
    const key = `${itemId}:${marketplace}`;
    if (retriesInFlight.current.has(key)) return;
    retriesInFlight.current.add(key);

    type Done = Extract<Publication, { status: 'done' }>;
    // Applied to the latest state, and only while it is still about this item: the answer
    // may arrive after other retries, or after the seller has started another listing.
    const update = (change: (current: Done) => Done) =>
      setPublication((current) =>
        current.status === 'done' && current.result.itemId === itemId ? change(current) : current,
      );

    const settle = (outcome: ListingOutcome) => {
      retriesInFlight.current.delete(key);
      update((current) => ({
        ...current,
        retrying: current.retrying.filter((id) => id !== marketplace),
        result: {
          ...current.result,
          listings: current.result.listings.map((previous) =>
            previous.marketplace === marketplace ? outcome : previous,
          ),
        },
      }));
    };

    update((current) => ({ ...current, retrying: [...current.retrying, marketplace] }));
    retryListing(itemId, marketplace)
      .then(settle)
      // The request did not get through, which is not the marketplace refusing the listing.
      .catch(() => settle({ marketplace, status: 'error', reason: 'unreachable' }));
  }

  function startOver() {
    setDraft(newDraft(newItemId()));
    setPublication({ status: 'idle' });
  }

  return (
    <NewListingContext
      value={{ draft, change: setDraft, publication, publish, retry, startOver }}>
      {children}
    </NewListingContext>
  );
}

export function useListingDraft(): NewListingContextValue {
  const value = use(NewListingContext);
  if (value === null) {
    throw new Error('useListingDraft must be used inside the new-listing flow.');
  }
  return value;
}
