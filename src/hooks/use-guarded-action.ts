import { useCallback, useRef, useState } from 'react';

export type GuardedOutcome =
  | { status: 'done' }
  | { status: 'failed'; error: unknown }
  /** The same request was already under way, so this one did nothing. */
  | { status: 'busy' };

/**
 * Runs requests to the server so that none is started twice at once. A key names a request,
 * such as "accept:offer-1": while it is under way, asking again does nothing. The guard is a
 * ref, because two presses can land before the next render and each must see the other.
 */
export function useGuardedAction(): {
  /** The keys of the requests under way, for disabling what started them. */
  working: readonly string[];
  run: (key: string, request: () => Promise<void>) => Promise<GuardedOutcome>;
} {
  const inFlight = useRef(new Set<string>());
  const [working, setWorking] = useState<readonly string[]>([]);

  const run = useCallback(async (key: string, request: () => Promise<void>) => {
    if (inFlight.current.has(key)) return { status: 'busy' } as const;

    inFlight.current.add(key);
    setWorking([...inFlight.current]);

    try {
      await request();
      return { status: 'done' } as const;
    } catch (error) {
      return { status: 'failed', error } as const;
    } finally {
      inFlight.current.delete(key);
      setWorking([...inFlight.current]);
    }
  }, []);

  return { working, run };
}
