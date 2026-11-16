import { sessionStorage } from '../session-storage.web';

describe('sessionStorage in the browser preview', () => {
  it('returns the session that was stored', async () => {
    await sessionStorage.setItem('key', 'session');

    expect(await sessionStorage.getItem('key')).toBe('session');
  });

  it('forgets the session when removed', async () => {
    await sessionStorage.setItem('key', 'session');

    await sessionStorage.removeItem('key');

    expect(await sessionStorage.getItem('key')).toBeNull();
  });
});
