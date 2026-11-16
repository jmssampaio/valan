# Testing rules (TDD)

## Where TDD is mandatory
Business logic, data transformations, external integrations (API clients, connectors), server functions, and database policies (RLS).

## Where it is not
Pure layout and styling. Screens get a smoke test and behaviour tests for their logic, written after the UI settles.

## The cycle
1. Red: write one failing test that describes the next piece of behaviour. Run it and confirm it fails for the right reason.
2. Green: write the minimum code that makes it pass. No extra features.
3. Refactor: clean up with the tests green. Then repeat.

## Rules
- Never write production code for mandatory areas without a failing test first.
- Never change a test just to make it pass; if the test is wrong, say why before changing it.
- One behaviour per test. Test names describe behaviour ("rejects an offer that has expired"), not implementation.
- Test through public interfaces. Do not test private functions or internal state.
- Mock only at the system boundary (network, clock, storage). Never mock the code under test.
- External APIs are tested against recorded or hand-written fixtures, never the live service.
- Every bug fix starts with a test that reproduces the bug.
- Tests must be fast and independent: no shared state, no required order.

## Tooling
- App: Jest with the `jest-expo` preset and React Native Testing Library (`render`, `screen`, `toBeOnTheScreen`). Test files go in `__tests__/` next to the code, named `*.test.ts(x)`.
- Edge Functions: Deno test (`deno test` inside `supabase/functions/`).
- RLS policies: pgTAP tests in `supabase/tests/`, run with `npx supabase test db`.
- Run all: `npm test` · watch: `npm test -- --watch` · one file: `npm test -- path/to/file`
