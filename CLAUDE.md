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
- `src/components/` — base UI components (`Screen`, `ScreenTitle`, `AppText`, `Button`, `ListRow`, `Tag`, `TextTabs`, `SegmentedControl`, `TabBar`, `SummaryStrip`, `Thumbnail`, `Wave`, `ScreenMessage`, `Notice`, `TextField`, `PriceField`, `CheckRow`, `ChipGrid`, `PhotoGrid`, `EvenGrid`, `FlowHeader`). Screens are built from these. `Screen` takes an optional `header`, `footer` and `scroll` for the steps of a flow. `ScreenMessage` is the shared block for empty, error and offline states.
- `src/features/<screen>/` — pure functions a screen needs to turn rows into what it shows (labels, filters, totals), with their tests. No React here.
- `src/constants/theme.ts` — design tokens (colours, text roles, spacing, radii, control heights). Screens use these, never raw values.
- `src/hooks/` — React hooks, including the ones that load a screen's data from the services (`use-listings-overview`) and `use-is-online`. `use-listing-draft` holds the one draft the new-listing steps share and what became of it when published. `*.web.ts` files are the browser variant (the browser is a development preview only).
- `src/app/dev/` — development-only screens, such as the component gallery at `/dev/components`; they redirect to the home screen in production builds.
- `src/i18n/` — translations: `t(key, values)` and one dictionary per language in `locales/`; `{name}` in a string is filled from `values`.
- `assets/images/` — app icons and drawn marks (`wave-line.svg`). `assets/samples/` — stand-in sleeve images used only by the sample data. SVG files are shown through `expo-image`, coloured with theme tokens via `svgVariables`.
- `assets/locales/` — the iOS permission texts in each language, wired through `locales` in `app.json`.
- `__mocks__/` — Jest stand-ins for native modules that have none under test (`expo-network`).
- `src/services/` — the service layer; the only place the app calls Supabase (enforced by a lint rule). `getSupabase()` in `supabase.ts` is the single client; `session-storage.ts` keeps the session encrypted. `listings.ts`, `offers.ts`, `sales.ts`, `catalogue.ts`, `drafts.ts`, `marketplaces.ts`, `connections.ts` and `publishing.ts` work on sample rows from `sample-data.ts` and `sample-catalogue.ts` (shaped like the database types) until the real queries replace them. `photo-picker.ts` wraps the camera and photo library (`expo-image-picker`).
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
- The app can delete an item only while it is a draft and can never write `items.status`; publishing, selling and removing an item go through Edge Functions, so app inserts and updates on `items` must not send `status`.
- A sale is a permanent record: it keeps a snapshot (`marketplace`, `item_title`, `item_artist`) and survives the deletion of its listing or item (`listing_id` becomes null). Only deleting the account deletes sales.
- Every table carries `user_id`; child tables use a composite foreign key so a row cannot belong to a different user than its parent.
- A record keeps the `format` and `release_year` of its catalogue release and is graded on the Goldmine scale (`media_condition`, `sleeve_condition`). Equipment has its own `equipment_condition` and none of the record fields; check constraints enforce both.
- The equipment condition is Valan's own scale: new, like_new, good, fair, for_parts, best to worst. The database never stores a marketplace's condition values; each connector maps Valan's scale to its marketplace, and several of ours may map to one of theirs. The contract tests require every connector that lists equipment to map every value. Finer values (excellent, very_good, poor) may be added later, for Reverb; nothing is removed.
- The eBay connector checks which conditions are valid for the listing's category against the eBay API; it never assumes them.
- Marketplace names, and what each marketplace can list, are never written into a screen or a translation. Each connector declares its capabilities (`itemTypes`, `requiresCatalogueRelease`, `respondToOffers`); the app reads the same shape from `src/services/marketplaces.ts` and builds the notice, its tag ("Só {name}" when one marketplace is left, "Sem {excluded}" when two or more are) and the "Publica em" list from it, so a new marketplace needs no new copy.
- A marketplace's requirements may limit where a listing goes, but never stop the seller from listing elsewhere; the app always says which marketplaces are excluded and why. Discogs accepts only records chosen from its catalogue, so a listing without a catalogue release (a record the catalogue lacks, or any other item) is valid and goes to eBay only. In the publish step an unavailable marketplace is shown disabled with the reason, never hidden (`marketplaceReach` in `src/features/new-listing/draft.ts`, `reachNotice` in `labels.ts`).
- New-listing step 1 is one field, "O que vais vender?". Catalogue editions appear as suggestions while the seller types; choosing one makes the item a record linked to that release. Without one (none of the editions, no results, or a failed or offline search) the seller continues with the typed name and only then says whether it is a record or another item, which picks the condition scale. The catalogue never blocks the flow.
- Money is stored in minor units (`price_minor`, `amount_minor`, `fees_minor`) with a currency code.
- App configuration: `EXPO_PUBLIC_SUPABASE_URL` and `EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY`.
- Data model: profiles, platform_connections, items, item_photos, listings, offers, sales, push_tokens.
- When an item sells on one marketplace, its listing is removed from the others.
- Records are identified through the Discogs catalogue (search or barcode). Equipment has no catalogue step and goes to eBay only.
- Sign-in: email, Sign in with Apple and Sign in with Google, all through Supabase Auth. Apple and Google buttons have equal prominence. Account deletion inside the app.
- The new-listing flow keeps one draft across its steps (`ListingDraftProvider` in `src/app/new-listing/_layout.tsx`). Leaving the flow, by Cancel or by swiping the sheet down, saves it as a draft item when it has a release or a title; if the save fails the seller chooses between retrying and leaving without saving. A draft is not kept if the app is killed mid-flow.
- A record needs its media condition to move past step 2; the sleeve condition is optional. Photos: up to 8.
- New-listing step 3 takes the price (stored in cents; `parsePrice` accepts digits with up to two decimals after a comma or point), whether offers are accepted, and the marketplaces. Every supported marketplace has a row: ticked by default when the listing can go there and the account is connected; otherwise shown disabled with the reason (not connected, or excluded by the marketplace's requirements). Fee estimates use each marketplace's `feeRate` and are labelled as estimates.
- Publishing goes through `src/services/publishing.ts` (fake for now): one outcome per marketplace, with a reason code the app has words for. Step 4 shows each outcome and retries one marketplace at a time. Once an item is sent it is no longer saved as a draft on leaving; if the request itself fails, nothing was published and the draft is still there. The sample publish service makes eBay refuse the first attempt (missing shipping policy) and accept the retry, to show the error path of mockup 07.
- Prices in lists use Inter semi-bold 17 with tabular figures (`Type.rowPrice`); Fraunces stays for titles, the summary figures, the sales total and the price field.
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
