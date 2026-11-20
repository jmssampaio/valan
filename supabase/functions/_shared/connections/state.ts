// The state of a connection attempt: an unguessable value that goes to the marketplace with
// the seller and comes back with them. Whoever holds it can finish that one attempt, so the
// database keeps only its hash.

const STATE_BYTES = 32;

export function newState(): string {
  const bytes = crypto.getRandomValues(new Uint8Array(STATE_BYTES));
  return btoa(String.fromCharCode(...bytes))
    .replaceAll('+', '-')
    .replaceAll('/', '_')
    .replaceAll('=', '');
}

/** SHA-256 in hex. The state is random and long, so a plain hash is enough to look it up by. */
export async function hashState(state: string): Promise<string> {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(state));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}
