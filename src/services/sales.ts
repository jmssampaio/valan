import { sampleSales } from './sample-data';

import type { Tables } from '@/types/database';

// Sample data until the Supabase queries exist; callers already get the final shape.
export async function listSales(): Promise<Tables<'sales'>[]> {
  return sampleSales();
}
