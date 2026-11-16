jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({ auth: {} })),
}));
jest.mock('../session-storage', () => ({
  sessionStorage: { getItem: jest.fn(), setItem: jest.fn(), removeItem: jest.fn() },
}));

function loadModules() {
  // A fresh module registry per test, because the client is created once and kept.
  jest.resetModules();
  const { createClient } =
    jest.requireMock<typeof import('@supabase/supabase-js')>('@supabase/supabase-js');
  const { sessionStorage } =
    jest.requireMock<typeof import('../session-storage')>('../session-storage');
  const { getSupabase } = jest.requireActual<typeof import('../supabase')>('../supabase');
  return { createClient: jest.mocked(createClient), sessionStorage, getSupabase };
}

beforeEach(() => {
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://valan.supabase.test';
  process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';
});

afterEach(() => {
  delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
});

describe('getSupabase', () => {
  it('connects to the configured project and keeps the session in the encrypted storage', () => {
    const { createClient, sessionStorage, getSupabase } = loadModules();

    getSupabase();

    expect(createClient).toHaveBeenCalledWith('https://valan.supabase.test', 'publishable-key', {
      auth: {
        storage: sessionStorage,
        persistSession: true,
        autoRefreshToken: true,
        detectSessionInUrl: false,
      },
    });
  });

  it('returns the same client every time', () => {
    const { createClient, getSupabase } = loadModules();

    expect(getSupabase()).toBe(getSupabase());
    expect(createClient).toHaveBeenCalledTimes(1);
  });

  it('fails with a clear error when the project is not configured', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    const { getSupabase } = loadModules();

    expect(() => getSupabase()).toThrow('EXPO_PUBLIC_SUPABASE_URL');
  });
});
