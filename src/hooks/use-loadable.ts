import { useCallback, useEffect, useState } from 'react';

export type LoadableState<Data> =
  | { status: 'loading' }
  | { status: 'error' }
  | {
      status: 'ready';
      data: Data;
      /** A refresh is under way; the last data stays on screen meanwhile. */
      refreshing: boolean;
      /** The last refresh failed, so what is shown may be out of date. */
      refreshFailed: boolean;
    };

export type LoadableActions = {
  /** Starts over after a failed load, showing the loading state. */
  reload: () => void;
  /** Loads again while keeping what is on screen, such as after an answer or on pull-to-refresh. */
  refresh: () => void;
};

/**
 * Loads what a screen shows, with the states every such screen has: loading, an error to
 * retry, ready, and a refresh that keeps what is on screen (and says so if it fails).
 * `load` must be stable between renders, such as a module function or one in `useCallback`;
 * when it changes, what it loads is loaded again, and an answer to the earlier one is ignored.
 */
export function useLoadable<Data>(load: () => Promise<Data>): LoadableState<Data> & LoadableActions {
  const [state, setState] = useState<LoadableState<Data>>({ status: 'loading' });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let ignore = false;

    load()
      .then((data) => {
        if (!ignore) setState({ status: 'ready', data, refreshing: false, refreshFailed: false });
      })
      // The screen turns this into a message; the cause is the service's to report.
      .catch(() => {
        if (ignore) return;
        // A failed refresh keeps what is shown; only a first load has nothing to keep.
        setState((previous) =>
          previous.status === 'ready'
            ? { ...previous, refreshing: false, refreshFailed: true }
            : { status: 'error' },
        );
      });

    return () => {
      ignore = true;
    };
  }, [load, attempt]);

  const reload = useCallback(() => {
    setState({ status: 'loading' });
    setAttempt((previous) => previous + 1);
  }, []);

  const refresh = useCallback(() => {
    setState((previous) =>
      previous.status === 'ready' ? { ...previous, refreshing: true } : previous,
    );
    setAttempt((previous) => previous + 1);
  }, []);

  return { ...state, reload, refresh };
}
