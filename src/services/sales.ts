import type { Tables } from '@/types/database';

// No marketplace is connected for real yet, so no seller has a sale. This reads the real
// sales once the orders Edge Function records them.
export async function listSales(): Promise<Tables<'sales'>[]> {
  return [];
}
