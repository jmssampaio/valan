import { useNetworkState } from 'expo-network';

/** False only when the device reports no connection; an unknown state counts as online. */
export function useIsOnline(): boolean {
  return useNetworkState().isConnected !== false;
}
