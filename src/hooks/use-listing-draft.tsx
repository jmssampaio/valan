import { createContext, use, useState, type ReactNode } from 'react';

import { emptyDraft, type ListingDraft } from '@/features/new-listing/draft';

type ListingDraftContextValue = {
  draft: ListingDraft;
  /** Replaces the draft with the result of a change, such as one of the functions in draft.ts. */
  change: (change: (draft: ListingDraft) => ListingDraft) => void;
};

const ListingDraftContext = createContext<ListingDraftContextValue | null>(null);

/** Holds the one draft every step of the new-listing flow reads and changes. */
export function ListingDraftProvider({ children }: { children: ReactNode }) {
  const [draft, setDraft] = useState(emptyDraft);

  return <ListingDraftContext value={{ draft, change: setDraft }}>{children}</ListingDraftContext>;
}

export function useListingDraft(): ListingDraftContextValue {
  const value = use(ListingDraftContext);
  if (value === null) {
    throw new Error('useListingDraft must be used inside the new-listing flow.');
  }
  return value;
}
