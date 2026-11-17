import { listItems } from './listings';
import { sampleOffers } from './sample-data';

// Sample data until the Supabase queries exist; callers already get the final shape.
export async function countPendingOffers(): Promise<number> {
  // An offer is always made on a listing, so a seller without any has none to answer.
  const items = await listItems();
  if (items.length === 0) return 0;

  return sampleOffers.filter((offer) => offer.status === 'pending').length;
}
