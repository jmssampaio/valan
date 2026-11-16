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
- Tests: `npm test`
- Database: `npx supabase db push` · types: `npx supabase gen types typescript --linked > src/types/database.ts`
- Switch environment: `npx supabase link --project-ref <staging or production ref>`. Database commands act on the linked project, so check which one is linked before pushing.

## Structure

- `src/app/` — Expo Router routes only: every file is a screen, `_layout.tsx` files define navigators.
- `src/components/` — reusable UI components; `src/components/ui/` for small building blocks.
- `src/constants/theme.ts` — design tokens (colors, fonts, spacing). Screens use these, never raw values.
- `src/hooks/` — React hooks. `*.web.ts(x)` files are web-only variants.
- `src/i18n/` — translations: `t()` and one dictionary per language in `locales/`.
- `src/services/` (planned) — the service layer; the only place the app calls Supabase.
- `src/types/database.ts` (planned) — generated Supabase types; never edit by hand.
- `supabase/` (planned) — migrations, Edge Functions (marketplace connectors) and RLS tests.
- Tests live next to the code in `__tests__/` folders; `jest/` holds Jest helpers.
- `expo-env.d.ts` — Expo's type references; committed so `npm run typecheck` works in CI.

## Rules (read before writing code)

@docs/standards/ux.md
@docs/standards/code.md
@docs/standards/testing.md
@docs/standards/security.md
@docs/standards/workflow.md

## Project decisions

- The app never calls eBay or Discogs directly. It calls Supabase Edge Functions, which hold the users' marketplace tokens.
- Each marketplace is a connector behind one interface: connect, publish, update, remove, listOrders, listOffers, respondOffer, plus a declaration of what it supports.
- Data model: profiles, platform_connections, items, item_photos, listings, offers, sales, push_tokens.
- When an item sells on one marketplace, its listing is removed from the others.
- Records are identified through the Discogs catalogue (search or barcode). Equipment has no catalogue step and goes to eBay only.
- Sign-in: email, Sign in with Apple and Sign in with Google, all through Supabase Auth. Apple and Google buttons have equal prominence. Account deletion inside the app.
- Home screen is the listings tab with a three-tile summary on top. The connect-platforms screen is shown only once, after sign-up.
- The paywall appears when publishing the first listing, only to users without a plan.
- Design source of truth: the mockups and logo in `docs/design/` (tokens and type in its README). Figma is no longer used.
- Languages: European Portuguese (`pt-PT`, the source), Spanish and English. Strings live in `src/i18n/locales/`; the device language picks one, English is the fallback.
- v1.0 is light mode only (`userInterfaceStyle: "light"`).
- Two environments: `staging` and `production`. Each is a separate Supabase project with its own keys and Edge Function secrets, and its own RevenueCat and marketplace credentials (eBay sandbox on staging; Discogs has no sandbox, so staging uses a test account with draft listings). Every change is deployed and checked on staging before production.

## Do not

- Do not install new dependencies without asking.
- Do not edit migration files that have already been applied; always create a new migration.
- Do not read or write `.env` files.
- Do not commit directly to `main`.
- Do not write business logic or integration code without a failing test first.
