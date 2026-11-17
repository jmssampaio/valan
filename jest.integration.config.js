// Tests that talk to the local Supabase stack (npx supabase start). They are kept out of
// `npm test`, which must run without Docker.
//
// They run in plain Node, not in the React Native test environment: that environment
// replaces `fetch`, and these tests need real requests to reach the local stack.
module.exports = {
  testEnvironment: 'node',
  transform: { '\\.[jt]sx?$': ['babel-jest', { presets: ['babel-preset-expo'] }] },
  moduleNameMapper: {
    '^@/(.*)$': '<rootDir>/src/$1',
    '^expo/virtual/env$': '<rootDir>/jest.integration.env.js',
    '^react-native-get-random-values$': '<rootDir>/jest.integration.empty.js',
  },
  testMatch: ['**/__integration__/**/*.test.ts'],
  globalSetup: '<rootDir>/jest.integration.setup.js',
  testTimeout: 30000,
};
