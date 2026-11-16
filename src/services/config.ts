export interface SupabaseConfig {
  url: string;
  publishableKey: string;
}

// Expo inlines EXPO_PUBLIC_* variables at build time, and only when they are
// written out in full, so they cannot be looked up by a computed name.
export function getSupabaseConfig(): SupabaseConfig {
  return {
    url: required('EXPO_PUBLIC_SUPABASE_URL', process.env.EXPO_PUBLIC_SUPABASE_URL),
    publishableKey: required(
      'EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY',
      process.env.EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    ),
  };
}

function required(name: string, value: string | undefined): string {
  if (!value) {
    throw new Error(`Missing environment variable ${name}. Copy .env.example to .env and fill it in.`);
  }
  return value;
}
