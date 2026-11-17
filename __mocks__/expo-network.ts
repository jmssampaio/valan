// The network state is a system boundary with no native module under Jest.
// Tests run online unless they mock this module themselves.
export const useNetworkState = jest.fn(() => ({ isConnected: true, isInternetReachable: true }));
