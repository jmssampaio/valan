import type { Tables } from '@/types/database';

/** A marketplace account, without its tokens: the app may never read those. */
export type ConnectionSummary = Pick<
  Tables<'platform_connections'>,
  'id' | 'user_id' | 'marketplace' | 'status'
>;

// The sample connections belong to nobody in particular.
const SAMPLE_USER = '00000000-0000-0000-0000-000000000000';

// Both accounts connected, until the connect flow and the Supabase query exist;
// callers already get the final shape.
export async function listConnections(): Promise<ConnectionSummary[]> {
  return (['discogs', 'ebay'] as const).map((marketplace) => ({
    id: `sample-connection-${marketplace}`,
    user_id: SAMPLE_USER,
    marketplace,
    status: 'connected',
  }));
}
