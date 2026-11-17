import { act, renderHook } from '@testing-library/react-native';

import { useGuardedAction } from '../use-guarded-action';

/** A request held back by hand, so a second press can land while it is under way. */
function held() {
  let finish: () => void = () => {};
  let fail: (error: Error) => void = () => {};
  const promise = new Promise<void>((resolve, reject) => {
    finish = resolve;
    fail = reject;
  });
  return { promise, finish, fail };
}

describe('useGuardedAction', () => {
  it('reports a request as done', async () => {
    const { result } = await renderHook(() => useGuardedAction());

    let outcome;
    await act(async () => {
      outcome = await result.current.run('pause', async () => {});
    });

    expect(outcome).toEqual({ status: 'done' });
  });

  it('reports a failed request with what went wrong', async () => {
    const error = new Error('network');
    const { result } = await renderHook(() => useGuardedAction());

    let outcome;
    await act(async () => {
      outcome = await result.current.run('pause', () => Promise.reject(error));
    });

    expect(outcome).toEqual({ status: 'failed', error });
  });

  it('knows what is under way, and stops knowing it once it is over', async () => {
    const request = held();
    const { result } = await renderHook(() => useGuardedAction());

    let pending: Promise<unknown> = Promise.resolve();
    await act(async () => {
      pending = result.current.run('accept:offer-1', () => request.promise);
    });
    expect(result.current.working).toEqual(['accept:offer-1']);

    await act(async () => {
      request.finish();
      await pending;
    });
    expect(result.current.working).toEqual([]);
  });

  it('does not start the same request twice while the first is under way', async () => {
    const request = held();
    const send = jest.fn(() => request.promise);
    const { result } = await renderHook(() => useGuardedAction());

    let first: Promise<unknown> = Promise.resolve();
    let second;
    await act(async () => {
      first = result.current.run('accept:offer-1', send);
      second = await result.current.run('accept:offer-1', send);
    });

    expect(second).toEqual({ status: 'busy' });
    expect(send).toHaveBeenCalledTimes(1);

    await act(async () => {
      request.finish();
      await first;
    });
  });

  it('lets a different request start meanwhile', async () => {
    const request = held();
    const { result } = await renderHook(() => useGuardedAction());

    let first: Promise<unknown> = Promise.resolve();
    let second;
    await act(async () => {
      first = result.current.run('accept:offer-1', () => request.promise);
      second = await result.current.run('accept:offer-2', async () => {});
    });

    expect(second).toEqual({ status: 'done' });

    await act(async () => {
      request.finish();
      await first;
    });
  });

  it('lets the same request start again once it is over, even after a failure', async () => {
    const { result } = await renderHook(() => useGuardedAction());
    await act(async () => {
      await result.current.run('pause', () => Promise.reject(new Error('network')));
    });

    let outcome;
    await act(async () => {
      outcome = await result.current.run('pause', async () => {});
    });

    expect(outcome).toEqual({ status: 'done' });
  });
});
