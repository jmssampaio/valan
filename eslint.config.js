// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    // Edge Functions are Deno code with their own tooling; database.ts is generated.
    ignores: ['dist/*', 'supabase/functions/*', 'src/types/database.ts'],
  },
  {
    files: ['src/**/*.{ts,tsx}'],
    ignores: ['src/services/**'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: '@supabase/supabase-js',
              message: 'Only src/services/ talks to Supabase. Call a service instead.',
            },
          ],
        },
      ],
    },
  },
]);
