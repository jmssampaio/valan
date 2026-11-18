import { renderHook } from '@testing-library/react-native';

import { useRefreshOnFocus } from '../use-refresh-on-focus';

// The navigator is the system boundary: its "screen is focused" callback is held, so a test
// can say when the screen is focused.
let focused: () => void = () => {};
jest.mock('expo-router', () => ({
  useFocusEffect: (callback: () => void) => {
    focused = callback;
  },
}));

describe('useRefreshOnFocus', () => {
  it('does not refresh when the screen opens, which already loads', async () => {
    const refresh = jest.fn();
    await renderHook(() => useRefreshOnFocus(refresh));

    focused();

    expect(refresh).not.toHaveBeenCalled();
  });

  it('refreshes each time the seller comes back to the screen', async () => {
    const refresh = jest.fn();
    await renderHook(() => useRefreshOnFocus(refresh));

    focused();
    focused();
    focused();

    expect(refresh).toHaveBeenCalledTimes(2);
  });
});
