import { sampleOffers } from './sample-data';

// Sample data until the Supabase queries exist; callers already get the final shape.
export async function countPendingOffers(): Promise<number> {
  return sampleOffers.filter((offer) => offer.status === 'pending').length;
}
