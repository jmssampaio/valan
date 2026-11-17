import { createContext, use, useState, type ReactNode } from 'react';

import { draftItemFields, emptyDraft, type ListingDraft } from '@/features/new-listing/draft';
import { publishItem, retryListing, type PublishResult } from '@/services/publishing';

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
  const [draft, setDraft] = useState(emptyDraft);
  const [publication, setPublication] = useState<Publication>({ status: 'idle' });

  function publish(marketplaces: readonly string[]) {
    setPublication({ status: 'publishing' });
    publishItem({ item: draftItemFields(draft), photos: draft.photos, marketplaces })
      .then((result) => setPublication({ status: 'done', result, retrying: [] }))
      // The result screen says nothing was published and offers to try again.
      .catch(() => setPublication({ status: 'failed', marketplaces }));
  }

  function retry(marketplace: string) {
    if (publication.status !== 'done') return;
    const { itemId } = publication.result;

    const settle = (outcome: PublishResult['listings'][number]) =>
      setPublication((current) =>
        current.status !== 'done'
          ? current
          : {
              ...current,
              retrying: current.retrying.filter((id) => id !== marketplace),
              result: {
                ...current.result,
                listings: current.result.listings.map((previous) =>
                  previous.marketplace === marketplace ? outcome : previous,
                ),
              },
            },
      );

    setPublication({ ...publication, retrying: [...publication.retrying, marketplace] });
    retryListing(itemId, marketplace)
      .then(settle)
      // The marketplace stays in error, with words that fit any cause, and can be tried again.
      .catch(() => settle({ marketplace, status: 'error', reason: 'unknown' }));
  }

  function startOver() {
    setDraft(emptyDraft);
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
