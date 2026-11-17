// The stand-in every unit test gets (see jest.setup.js). A unit test must never reach a
// Supabase project: whatever a developer has configured, a call that gets this far stops
// here. Services are tested against the local stack (npm run test:integration).
const refuse = (): never => {
  throw new Error(
    'A unit test tried to reach Supabase. Mock the service it calls, or move the test to __integration__.',
  );
};

export const getSupabase = jest.fn(refuse);
export const requireUserId = jest.fn(async () => refuse());
