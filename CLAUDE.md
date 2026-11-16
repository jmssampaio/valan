# Valan

Mobile app that lets second-hand sellers publish a listing once and manage it across several marketplaces. First niche: music (vinyl, CDs, cassettes, audio equipment).

Full product brief (scope, flows, marketplaces, open questions): @docs/PROJECT_BRIEF.md

## Stack

- App: React Native with Expo, TypeScript. iOS only in v1.0.
- Backend: Supabase — Auth, Postgres with RLS, Storage, Edge Functions, scheduled jobs.
- Payments: RevenueCat (subscription via in-app purchase).
- Marketplaces: eBay and Discogs in v1.0. Reverb and Etsy later.

## Commands

- Install: `npm install`
- Run: `npx expo start`
- Lint: `npm run lint`
- Type check: `npm run typecheck`
- Tests: `npm test` (app) · `npm run test:db` (RLS, pgTAP) · `npm run test:functions` (Edge Functions, Deno)
- Local database (needs Docker running): `npx supabase db start` · apply all migrations from scratch: `npx supabase db reset`
- Types, after every migration: `npx supabase gen types typescript --local > src/types/database.ts` (CI fails if the file is out of date)
- Deploy migrations to the linked project: `npx supabase db push`
- Switch environment: `npx supabase link --project-ref <staging or production ref>`. Database commands act on the linked project, so check which one is linked before pushing.

## Structure

- `src/app/` — Expo Router routes only: every file is a screen, `_layout.tsx` files define navigators. `(tabs)/` holds the four tabs; `new-listing/` and `subscription` open as modals. No test files here.
- `src/components/` — base UI components (`Screen`, `ScreenTitle`, `AppText`, `Button`, `ListRow`, `Tag`, `TextTabs`, `SegmentedControl`, `TabBar`). Screens are built from these.
- `src/constants/theme.ts` — design tokens (colours, text roles, spacing, radii, control heights). Screens use these, never raw values.
- `src/hooks/` — React hooks. `*.web.ts` files are the browser variant (the browser is a development preview only).
- `src/app/dev/` — development-only screens, such as the component gallery at `/dev/components`; they redirect to the home screen in production builds.
- `src/i18n/` — translations: `t()` and one dictionary per language in `locales/`.
- `src/services/` — the service layer; the only place the app calls Supabase (enforced by a lint rule). `getSupabase()` in `supabase.ts` is the single client; `session-storage.ts` keeps the session encrypted.
- `supabase/migrations/` — schema changes. `supabase/tests/` — pgTAP tests for RLS and data rules.
- `supabase/functions/` — Edge Functions (Deno, excluded from the app's lint, type check and Jest). `_shared/connectors/` holds the connector interface (`types.ts`), the in-memory `fake.ts`, and `contract.ts`, the test suite every connector must pass.
- Tests live next to the code in `__tests__/` folders; navigation tests are in `src/__tests__/`.
- `src/types/` — `expo.d.ts` loads Expo's ambient types for `npm run typecheck` (Expo's own `expo-env.d.ts` is generated and git-ignored); `database.ts` holds the generated Supabase types, never edited by hand.

## Rules (read before writing code)

@docs/standards/ux.md
@docs/standards/code.md
@docs/standards/testing.md
@docs/standards/security.md
@docs/standards/workflow.md

## Project decisions

- The app never calls eBay or Discogs directly. It calls Supabase Edge Functions, which hold the users' marketplace tokens.
- Each marketplace is a connector behind one interface: startConnect, finishConnect (OAuth is two steps), publish, update, remove, listOrders, listOffers, respondOffer, plus a declaration of what it supports. Connectors throw only `ConnectorError`, with a `kind` the caller can act on.
- The app writes only `profiles` (language and currency), `items`, `item_photos` and `push_tokens`. `platform_connections`, `listings`, `offers` and `sales` are written by Edge Functions; the app can read them, except the token columns, so queries on `platform_connections` must name their columns.
- Every table carries `user_id`; child tables use a composite foreign key so a row cannot belong to a different user than its parent.
- Money is stored in minor units (`price_minor`, `amount_minor`, `fees_minor`) with a currency code.
- App configuration: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Data model: profiles, platform_connections, items, item_photos, listings, offers, sales, push_tokens.
- When an item sells on one marketplace, its listing is removed from the others.
- Records are identified through the Discogs catalogue (search or barcode). Equipment has no catalogue step and goes to eBay only.
- Sign-in: email, Sign in with Apple and Sign in with Google, all through Supabase Auth. Apple and Google buttons have equal prominence. Account deletion inside the app.
- Home screen is the listings tab with a three-tile summary on top. The connect-platforms screen is shown only once, after sign-up.
- The paywall appears when publishing the first listing, only to users without a plan.
- Design source of truth: the mockups and logo in `docs/design/` (tokens and type in its README). Figma is no longer used.
- Languages: European Portuguese (`pt-PT`, the source), Spanish and English. Strings live in `src/i18n/locales/`; the device language picks one, English is the fallback.
- v1.0 is light mode only (`userInterfaceStyle: "light"`).
- Two environments: `staging` (Supabase project "Valan Staging", ref `guinjxcsacyzqhmhpugf`) and `production` (Supabase project "Valan", ref `gjecpafvndblkwvcnqmg`), both in `eu-central-1`. Each is a separate Supabase project with its own keys and Edge Function secrets, and its own RevenueCat and marketplace credentials (eBay sandbox on staging; Discogs has no sandbox, so staging uses a test account with draft listings). Every change is deployed and checked on staging before production.

## Do not

- Do not install new dependencies without asking.
- Do not edit migration files that have already been applied; always create a new migration.
- Do not read or write `.env` files.
- Do not commit directly to `main`.
- Do not write business logic or integration code without a failing test first.
