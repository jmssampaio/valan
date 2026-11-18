import { useFocusEffect } from 'expo-router';
import { useCallback, useRef } from 'react';

/**
 * Refreshes a screen each time the seller comes back to it, such as from the new-listing flow,
 * so it shows what changed there. The first focus is the screen opening, which already loads.
 */
export function useRefreshOnFocus(refresh: () => void): void {
  const hasOpened = useRef(false);

  useFocusEffect(
    useCallback(() => {
      if (hasOpened.current) refresh();
      hasOpened.current = true;
    }, [refresh]),
  );
}
