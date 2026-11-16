// The browser is a development preview only. Sessions must never be kept in
// localStorage (docs/standards/security.md), so here they last until the page reloads.
const memory = new Map<string, string>();

/** The storage the Supabase client keeps its session in. */
export const sessionStorage = {
  async getItem(storageKey: string): Promise<string | null> {
    return memory.get(storageKey) ?? null;
  },

  async setItem(storageKey: string, value: string): Promise<void> {
    memory.set(storageKey, value);
  },

  async removeItem(storageKey: string): Promise<void> {
    memory.delete(storageKey);
  },
};
