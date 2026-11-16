import { getSupabaseConfig } from '../config';

// Expo's Babel preset keeps a reference to the process.env object, so the variables
// are set and removed one by one; replacing process.env itself would not be seen.
const names = ['EXPO_PUBLIC_SUPABASE_URL', 'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY'] as const;
const original = names.map((name) => [name, process.env[name]] as const);

afterEach(() => {
  for (const [name, value] of original) {
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
});

describe('getSupabaseConfig', () => {
  it('returns the project URL and publishable key from the environment', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://valan.supabase.test';
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';

    expect(getSupabaseConfig()).toEqual({
      url: 'https://valan.supabase.test',
      publishableKey: 'publishable-key',
    });
  });

  it('names the missing variable when the URL is not set', () => {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY = 'publishable-key';

    expect(() => getSupabaseConfig()).toThrow('EXPO_PUBLIC_SUPABASE_URL');
  });

  it('names the missing variable when the publishable key is not set', () => {
    process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://valan.supabase.test';
    delete process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

    expect(() => getSupabaseConfig()).toThrow('EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY');
  });
});
