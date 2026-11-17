// No marketplace is connected for real yet, so no seller has an offer to answer. This counts
// the real pending offers once the offers Edge Function writes them.
export async function countPendingOffers(): Promise<number> {
  return 0;
}
