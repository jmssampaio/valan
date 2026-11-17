import { useEffect, useState } from 'react';

import { listConnections, type ConnectionSummary } from '@/services/connections';

export type ConnectionsState =
  | { status: 'loading' }
  | { status: 'error' }
  | { status: 'ready'; connections: ConnectionSummary[] };

type Outcome = {
  attempt: number;
  connections: ConnectionSummary[] | null;
};

/** The seller's marketplace accounts, with a way to load them again after a failure. */
export function useConnections(): ConnectionsState & { reload: () => void } {
  const [outcome, setOutcome] = useState<Outcome | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    listConnections()
      .then((connections) => {
        if (!ignore) setOutcome({ attempt, connections });
      })
      // The screen turns this into a message with a retry; the cause is the service's to report.
      .catch(() => {
        if (!ignore) setOutcome({ attempt, connections: null });
      });

    return () => {
      ignore = true;
    };
  }, [attempt]);

  const reload = () => setAttempt((previous) => previous + 1);

  if (outcome === null || outcome.attempt !== attempt) return { status: 'loading', reload };
  if (outcome.connections === null) return { status: 'error', reload };
  return { status: 'ready', connections: outcome.connections, reload };
}
