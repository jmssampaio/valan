import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useLoadable } from '../use-loadable';

/** An answer held back by hand, so the state while waiting can be seen. */
function held<Data>() {
  let deliver: (value: Data) => void = () => {};
  const promise = new Promise<Data>((resolve) => (deliver = resolve));
  return { promise, deliver };
}

describe('useLoadable', () => {
  it('starts loading and then has what was loaded', async () => {
    const answer = held<string>();
    const load = jest.fn(() => answer.promise);
    const { result } = await renderHook(() => useLoadable(load));

    expect(result.current.status).toBe('loading');
    await act(async () => answer.deliver('offers'));

    expect(result.current).toMatchObject({ status: 'ready', data: 'offers', refreshing: false, refreshFailed: false });
  });

  it('says so when loading fails, and loads again from the start on reload', async () => {
    const load = jest.fn().mockRejectedValueOnce(new Error('network')).mockResolvedValue('offers');
    const { result } = await renderHook(() => useLoadable(load));
    await waitFor(() => expect(result.current.status).toBe('error'));

    const answer = held<string>();
    load.mockReturnValueOnce(answer.promise);
    await act(async () => result.current.reload());
    expect(result.current.status).toBe('loading');
    await act(async () => answer.deliver('offers'));

    expect(result.current).toMatchObject({ status: 'ready', data: 'offers' });
  });

  it('keeps what is on screen while it refreshes', async () => {
    const load = jest.fn().mockResolvedValue('offers');
    const { result } = await renderHook(() => useLoadable(load));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const answer = held<string>();
    load.mockReturnValueOnce(answer.promise);
    await act(async () => result.current.refresh());
    expect(result.current).toMatchObject({ status: 'ready', data: 'offers', refreshing: true });
    await act(async () => answer.deliver('newer offers'));

    expect(result.current).toMatchObject({ data: 'newer offers', refreshing: false, refreshFailed: false });
  });

  it('keeps what is on screen and says it may be out of date when a refresh fails', async () => {
    const load = jest.fn().mockResolvedValue('offers');
    const { result } = await renderHook(() => useLoadable(load));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    load.mockRejectedValueOnce(new Error('network'));

    await act(async () => result.current.refresh());

    await waitFor(() =>
      expect(result.current).toMatchObject({ status: 'ready', data: 'offers', refreshFailed: true, refreshing: false }),
    );
  });

  it('loads again when what it loads changes', async () => {
    const first = jest.fn().mockResolvedValue('first');
    const second = jest.fn().mockResolvedValue('second');
    const { result, rerender } = await renderHook(({ load }: { load: () => Promise<string> }) => useLoadable(load), {
      initialProps: { load: first },
    });
    await waitFor(() => expect(result.current).toMatchObject({ data: 'first' }));

    await rerender({ load: second });

    await waitFor(() => expect(result.current).toMatchObject({ data: 'second' }));
  });

  it('ignores an answer that arrives after what it loads has changed', async () => {
    const slow = held<string>();
    const { result, rerender } = await renderHook(({ load }: { load: () => Promise<string> }) => useLoadable(load), {
      initialProps: { load: () => slow.promise },
    });

    await rerender({ load: () => Promise.resolve('current') });
    await waitFor(() => expect(result.current).toMatchObject({ data: 'current' }));
    await act(async () => slow.deliver('stale'));

    expect(result.current).toMatchObject({ data: 'current' });
  });
});
