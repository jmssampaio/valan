# Valan — Project brief

Everything decided so far, in one place. Put this file at `docs/PROJECT_BRIEF.md` and reference it from CLAUDE.md with `@docs/PROJECT_BRIEF.md`.

Facts about third-party APIs and Apple requirements below were written from memory, without checking current documentation. Verify each one against the official docs before building on it.

## Product

Valan lets second-hand sellers publish a listing once and manage it across several marketplaces from one app: listings, offers and sales in a single place. First niche: music (vinyl, CDs, cassettes, audio equipment). The name joins the founder's three sons: Valentino, Alessandro, Antonio.

Audience: other sellers (a public product, not a personal tool). Business model: subscription from v1.0, 7-day free trial.

## Scope of v1.0

iOS only. Marketplaces: eBay and Discogs. Target: App Store submission about two weeks after development starts.

### Features
1. Account: email, Sign in with Apple and Sign in with Google; delete account inside the app.
2. Connect marketplace accounts (OAuth per marketplace); show status; disconnect.
3. Create listing: item type (record / equipment); for records, identify the release in the Discogs catalogue by search or barcode to prefill data; media and sleeve condition (Goldmine scale); the seller's own photos; price; accept offers yes/no; choose marketplaces (only those compatible with the item); result per marketplace (published, or error with reason).
4. My listings: status per marketplace; edit, pause and remove, propagated everywhere.
5. Stock sync: when an item sells on one marketplace, remove it from the others.
6. Offers: one inbox; accept or reject where the API allows it; otherwise open the offer on the marketplace.
7. Sales history: imported orders with date, item, marketplace, price, fees; totals per period.
8. Push notifications: new offer, new sale.

### Out of scope for v1.0
Buyer messaging, shipping labels, price suggestions, advanced statistics, Android, dark mode, Reverb, Etsy, optional 2FA screen.

## Marketplaces

| Marketplace | Publish | Offers via API | Covers | Phase |
|---|---|---|---|---|
| eBay | Yes (Sell Inventory API, OAuth 2) | Yes (Best Offer, Trading API) | Records and equipment | v1.0 |
| Discogs | Yes (OAuth 1.0a) | Listing can allow offers; accept/reject via API unconfirmed | Records only (needs a catalogue release) | v1.0 |
| Reverb | Yes | Yes | Audio equipment | later |
| Etsy | Yes (commercial access needs approval) | Probably not | Vintage items (20+ years) | later |

Wallapop, Vinted and Facebook Marketplace have no public API for this use.

Known constraints to confirm:
- eBay sellers need business policies (shipping, payment, returns) and a location set on their account before a listing can be published.
- eBay requires real photos for used items.
- Discogs has no sandbox; test with draft listings. Whether seller photos can be uploaded through the API is unknown.
- eBay production keys already exist; confirm the OAuth redirect (RuName).

## Architecture

- The app talks only to Supabase. Edge Functions hold the users' marketplace tokens and call eBay and Discogs.
- Each marketplace is a connector behind one interface: `connect`, `publish`, `update`, `remove`, `listOrders`, `listOffers`, `respondOffer`, plus a capabilities declaration.
- A scheduled job polls orders and offers for every connected account, records sales and offers, delists sold items elsewhere, and sends push notifications.
- Subscription state comes from RevenueCat.

### Data model
- `profiles`: user, language, currency.
- `platform_connections`: user, marketplace, encrypted tokens, status, expiry.
- `items`: type, title, artist, `discogs_release_id`, media condition, sleeve condition, description, price, currency, accepts offers, status (draft / active / sold / removed).
- `item_photos`: item, storage path, order.
- `listings`: item, marketplace, external id, URL, status (pending / published / error / paused / removed), error message.
- `offers`: listing, external id, buyer, amount, status, expires at.
- `sales`: listing, external order id, price, fees, buyer, date.
- `push_tokens`: user, device token.

## Screens and flows

Figma file: https://www.figma.com/design/DfsEhL8WD90IkCQ20FcFBu ("Valan — Mockups v1.0"). Pages: Mockups v1.0, Fluxos, Logo. Screen names and copy in the file are in Portuguese.

Screens: 01 Welcome · 02 Connect marketplaces · 03 Listings (home, with a three-tile summary: pending offers, month sales, listings with errors) · 04–07 New listing (catalogue, condition and photos, price and marketplaces, result) · 08 Listing detail · 09 Offers · 10 Sales · 11 Account · 12 Subscription.

Flows:
- Sign-in options on Welcome: Apple, Google, email (the mockup still shows only Apple and email).
- First sign-in: Welcome → Connect marketplaces (shown once; can be skipped) → Listings.
- Later sign-ins: straight to Listings.
- Create listing: Listings → 04 → 05 → 06 → Subscription (only without an active plan) → 07 → 08.
- Offer: notification → Offers → accept → sale recorded and listing removed elsewhere.
- Paywall: appears on "Publish" of the first listing; if closed, the listing is saved as a draft.

Known gaps in the mockups: values are hardcoded (no Figma variables or components yet); white text on the orange button fails contrast (about 3.7:1); small buttons and condition chips are below 44 pt; no empty, loading, error or confirmation states; no email sign-in screen; placeholder prices and data.

## Brand

Logo: a straight-line zigzag wave on an orange tile, with the wordmark "VALAN" in spaced capitals below. Current colours: orange `#E4572E`, cream `#F6F2EA`, ink `#16130F`. The primary colour may still change to fix contrast.

## Suggested build order

1. Project base, database schema with RLS, sign-in (email, Apple, Google), account deletion.
2. Connect eBay and Discogs accounts through Edge Functions.
3. Create listing: catalogue search, barcode, form, photos.
4. Publish to Discogs and eBay; status and errors per marketplace.
5. Manage listings: edit, pause, remove. First TestFlight build.
6. Sales and stock sync; sales history.
7. Offers; push notifications.
8. Subscription with RevenueCat; store listing; privacy policy; submit.
9. Fix review feedback.

## External dependencies (owner: the founder)

- Apple Developer Program enrolment (not yet active); later the Paid Apps agreement and banking details.
- Discogs developer app registration.
- Google Cloud project with OAuth client IDs for Google sign-in.
- Supabase project; RevenueCat account and App Store subscription products.
- A domain with a privacy policy and support page.
- A demo account for App Store review, with test eBay and Discogs accounts connected.

## Open questions

- Can Discogs offers be accepted or rejected through the API? Can listing photos be uploaded?
- Final primary colour.
- Subscription prices (mockup values are placeholders).
- Launch languages.
- Whether the name "Valan" is free on the App Store.
