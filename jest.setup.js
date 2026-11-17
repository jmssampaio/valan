// Signing in talks to Supabase, which no unit test may reach. Every test gets the stand-in in
// src/services/__mocks__/auth.ts; the real service is tested against the local stack
// (npm run test:integration).
jest.mock('@/services/auth');
