import { act, renderHook, waitFor } from '@testing-library/react-native';

import { useListingDetail } from '../use-listing-detail';

import { getListingDetail, type ListingDetail } from '@/services/listing-detail';

// The service is the system boundary: answers are made up here.
jest.mock('@/services/listing-detail');

const detail = { item: { id: 'item-1', title: 'Noites de Lisboa' } } as ListingDetail;

// An answer held back by hand, so the state while waiting can be seen.
function held(): { promise: Promise<ListingDetail | null>; deliver: (value: ListingDetail | null) => void } {
  let deliver: (value: ListingDetail | null) => void = () => {};
  const promise = new Promise<ListingDetail | null>((resolve) => (deliver = resolve));
  return { promise, deliver };
}

beforeEach(() => {
  jest.mocked(getListingDetail).mockResolvedValue(detail);
});

describe('useListingDetail', () => {
  it('starts loading and then has the detail', async () => {
    const answer = held();
    jest.mocked(getListingDetail).mockReturnValueOnce(answer.promise);
    const { result } = await renderHook(() => useListingDetail('item-1'));

    expect(result.current.status).toBe('loading');
    await act(async () => answer.deliver(detail));
    expect(result.current).toMatchObject({ status: 'ready', detail });
    expect(getListingDetail).toHaveBeenCalledWith('item-1');
  });

  it('says so when the item does not exist', async () => {
    jest.mocked(getListingDetail).mockResolvedValue(null);

    const { result } = await renderHook(() => useListingDetail('gone'));

    await waitFor(() => expect(result.current.status).toBe('notFound'));
  });

  it('says so when loading fails, and loads again on reload', async () => {
    jest.mocked(getListingDetail).mockRejectedValueOnce(new Error('network'));
    const { result } = await renderHook(() => useListingDetail('item-1'));
    await waitFor(() => expect(result.current.status).toBe('error'));

    const answer = held();
    jest.mocked(getListingDetail).mockReturnValueOnce(answer.promise);
    await act(async () => result.current.reload());

    expect(result.current.status).toBe('loading');
    await act(async () => answer.deliver(detail));
    expect(result.current.status).toBe('ready');
  });

  it('keeps what is on screen while it refreshes', async () => {
    const { result } = await renderHook(() => useListingDetail('item-1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));

    const answer = held();
    jest.mocked(getListingDetail).mockReturnValueOnce(answer.promise);
    await act(async () => result.current.refresh());

    expect(result.current).toMatchObject({ status: 'ready', detail, refreshing: true });
    await act(async () => answer.deliver(detail));
    expect(result.current).toMatchObject({ refreshing: false });
  });

  it('keeps the detail and says it may be out of date when a refresh fails', async () => {
    const { result } = await renderHook(() => useListingDetail('item-1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    jest.mocked(getListingDetail).mockRejectedValueOnce(new Error('network'));

    await act(async () => result.current.refresh());

    await waitFor(() => expect(result.current).toMatchObject({ status: 'ready', refreshFailed: true }));
  });

  it('turns to not found when a refresh finds the item gone', async () => {
    const { result } = await renderHook(() => useListingDetail('item-1'));
    await waitFor(() => expect(result.current.status).toBe('ready'));
    jest.mocked(getListingDetail).mockResolvedValueOnce(null);

    await act(async () => result.current.refresh());

    await waitFor(() => expect(result.current.status).toBe('notFound'));
  });
});
