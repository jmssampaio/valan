import { USER_ID } from './sample-data';

import type { Tables } from '@/types/database';

/** A marketplace account, without its tokens: the app may never read those. */
export type ConnectionSummary = Pick<
  Tables<'platform_connections'>,
  'id' | 'user_id' | 'marketplace' | 'status'
>;

// Both accounts connected, until the connect flow and the Supabase query exist;
// callers already get the final shape.
export async function listConnections(): Promise<ConnectionSummary[]> {
  return (['discogs', 'ebay'] as const).map((marketplace) => ({
    id: `sample-connection-${marketplace}`,
    user_id: USER_ID,
    marketplace,
    status: 'connected',
  }));
}
