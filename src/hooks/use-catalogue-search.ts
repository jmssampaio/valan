import { useEffect, useState } from 'react';

import { searchReleases, type CatalogueRelease } from '@/services/catalogue';

export type CatalogueSearch =
  /** Nothing typed yet. */
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; releases: CatalogueRelease[] };

/** The answer to one search; it only counts while the seller still wants that search. */
type Outcome = {
  query: string;
  attempt: number;
  releases: CatalogueRelease[] | null;
};

// Long enough that typing a title is one search, not one per letter.
const TYPING_PAUSE_MS = 300;

/** Searches the catalogue as the seller types, with a way to try again after a failure. */
export function useCatalogueSearch(query: string): CatalogueSearch & { retry: () => void } {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);
  const wanted = query.trim();

  useEffect(() => {
    if (wanted === '') return;

    let ignore = false;
    const pause = setTimeout(() => {
      searchReleases(wanted)
        .then((releases) => {
          if (!ignore) setOutcome({ query: wanted, attempt, releases });
        })
        // The screen turns this into a message with a retry; the cause is the service's to report.
        .catch(() => {
          if (!ignore) setOutcome({ query: wanted, attempt, releases: null });
        });
    }, TYPING_PAUSE_MS);

    return () => {
      ignore = true;
      clearTimeout(pause);
    };
  }, [wanted, attempt]);

  const retry = () => setAttempt((previous) => previous + 1);

  if (wanted === '') return { status: 'idle', retry };
  if (outcome === null || outcome.query !== wanted || outcome.attempt !== attempt) {
    return { status: 'loading', retry };
  }
  if (outcome.releases === null) return { status: 'error', retry };
  return { status: 'ready', releases: outcome.releases, retry };
}
