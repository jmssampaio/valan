# Valan — Project brief

Everything decided so far, in one place. Put this file at `docs/PROJECT_BRIEF.md` and reference it from CLAUDE.md with `@docs/PROJECT_BRIEF.md`.

Facts about third-party APIs and Apple requirements below were written from memory, without checking current documentation. Verify each one against the official docs before building on it.

## Product

Valan lets second-hand sellers publish a listing once and manage it across several marketplaces from one app: listings, offers and sales in a single place. First niche: music (vinyl, CDs, cassettes, audio equipment). The name joins the founder's three sons: Valentino, Alessandro, Antonio.

Audience: other sellers (a public product, not a personal tool). Business model: subscription from v1.0, 7-day free trial.

## Scope of v1.0

iOS only. Marketplaces: eBay and Discogs. Languages: European Portuguese (source), Spanish and English. Target: App Store submission about two weeks after development starts.

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

Design source of truth: the v2 mockups and logo in `docs/design/` (see its README). The earlier Figma file is no longer used. Screen names and copy in the mockups are in Portuguese.

Screens: 01 Welcome · 02 Connect marketplaces · 03 Listings (home, with a three-tile summary: pending offers, month sales, listings with errors) · 04–07 New listing (catalogue, condition and photos, price and marketplaces, result) · 08 Listing detail · 09 Offers · 10 Sales · 11 Account · 12 Subscription.

Flows:
- Sign-in options on Welcome: Apple, Google, email (the mockup still shows only Apple and email).
- First sign-in: Welcome → Connect marketplaces (shown once; can be skipped) → Listings.
- Later sign-ins: straight to Listings.
- Create listing: Listings → 04 → 05 → 06 → Subscription (only without an active plan) → 07 → 08.
- Offer: notification → Offers → accept → sale recorded and listing removed elsewhere.
- Paywall: appears on "Publish" of the first listing; if closed, the listing is saved as a draft.

Known gaps in the mockups: loading, offline and error states; the equipment path of the new-listing flow; the email sign-in form; the delete-account confirmation; placeholder prices and data. The v1 contrast and touch-target problems are fixed in v2.

## Brand

Logo: a straight-line zigzag wave on an orange tile, with the wordmark "VALAN" in spaced capitals below. Colours: orange `#B4460F`, cream `#F5EFE6`, ink `#1E1A17` (full token list and contrast checks in `docs/design/README.md`). Type: Fraunces, Inter and IBM Plex Mono.

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
- Subscription prices (mockup values are placeholders).
- Whether the name "Valan" is free on the App Store.

## Open items before release

- **Custom SMTP and the code email templates on staging and production.** Supabase's built-in email sender is rate-limited (a few emails an hour), meant for testing only, and on the free plan does not allow changing the email templates. So staging still sends the default email with a link, and the 6-digit code flow is built and tested against the local stack, where emails are captured. The founder sets up a domain and an email-sending account and enters the SMTP credentials in the Supabase dashboard (never in the repository). Only then is `supabase config push` run, which applies the code templates (confirmation and password reset), the "password changed" notice, the 6-digit length and the ten-minute expiry. Until then neither signing up nor resetting a password can be completed on staging.
- **No per-account lockout on codes (accepted for this release).** The emailed codes for confirming an account and for resetting a password are six digits, valid for ten minutes, and guesses are limited by the server per IP address, not per account. That is enough for now. Before growth, consider a CAPTCHA on the auth endpoints (sign-in, sign-up, code verification, password reset) as the mitigation.
- **Changing the password while signed in** belongs to the Conta screen work, and must ask for the current password first (re-authentication, `docs/standards/security.md`).
- **Breached-password rejection:** to be turned on in the Supabase dashboard (staging and production).
- **Publish the `delete-account` function on staging and production.** Account deletion inside the app is built and tested against the local stack, including the purge of the user's photo folder. The function is not deployed anywhere yet; it needs `supabase functions deploy delete-account` on each project, with the founder's go-ahead.
- **Publish the connection functions and set their secrets.** `connect-start`, `connect-callback` and `disconnect` are built and tested against the local stack; none is deployed. Each environment needs the migration, the three functions, and its own secrets set in the dashboard by the founder: `DISCOGS_CONSUMER_KEY`, `DISCOGS_CONSUMER_SECRET` and a `CONNECTION_TOKENS_KEY` of its own (`openssl rand -base64 32`; never the same key in two environments, never in the repository). Losing a key makes every stored connection unreadable: sellers would have to connect again.
- **First real connection to Discogs.** The connector is tested against hand-written answers that follow the Discogs documentation. Three things only the live service can confirm, on the first connection with the test account: that Discogs sends the seller to the callback address we pass in the request (and not only to one typed into the application's settings, which would need one Discogs application per environment); that it accepts the signature percent-encoded in the header, as OAuth 1.0a specifies; and what it sends when the seller refuses.
- **Listings of a disconnected marketplace (open question for the publish function).** Disconnecting deletes Valan's access; listings already published stay on the marketplace and Valan stops managing them. How the app shows such a listing (still "published"? a state of its own? hidden?), and what happens to its offers and to a sale made there afterwards, is to decide when publishing is built.
- **Rate limits on the connection functions.** `connect-start` needs a session but nothing limits how often one account may call it, and each call asks Discogs for a request token under Valan's keys. `connect-callback` is public; a guess costs one indexed lookup and never reaches a marketplace. `docs/standards/security.md` asks for a limit per IP and per account on both; none exists yet for any function.
- **A connection approved on someone else's link (to decide; close it before publishing is built).** The callback carries no Valan session, so the server cannot tell who approved. If a seller is tricked into approving a link that another account started, their marketplace account is connected to that other account, which could then act on it through Valan once publishing exists. Nothing in place really limits this: the page the seller sees is the marketplace's genuine one naming Valan, which is what makes the lure believable, and the ten minutes of a link do not help because a fresh one can be made at any moment. The mirror case has the same root: someone who obtained a seller's authorization address could approve it with their own marketplace account; the account name shown in the app is the only sign. The fix is to finish the last step from the app with the seller's session: the callback keeps what the marketplace sent and returns to the app with a one-time code of ours, and only a call from the app, signed in as the seller who started, completes the connection. Today a connection can do nothing but show a name, so this does not block the connect screen; it must be closed before the publish and orders functions.
- **A disconnect does not cancel a connection that is finishing at that moment.** `connect-callback` takes the attempt and then asks the marketplace (up to about twenty seconds). A `disconnect` arriving in between finds nothing to delete and answers that it is done; the callback then stores the connection. It needs the seller themselves to do both at once (two devices), not an attacker. The fix is to keep the attempt marked "in use" until the connection is stored, so that disconnecting can cancel it.
- **Small hardening left for the connection functions.** The request body is read before the caller is identified (as in `delete-account`); the size of an answer from a marketplace is not capped (the host is trusted and the wait is ten seconds); `APP_CONNECT_URL` is used as it is set.
- **Rotating the token key.** Stored values carry their key version and the cipher reads several versions, but there is no job yet that re-encrypts stored rows under a new key.
- **Account deletion once marketplaces are connected.** It must then also revoke the seller's marketplace access and take their published listings down before deleting. Sellers who signed in with Apple or Google will need another way to confirm than their password. Whether sales records must be kept for tax reasons after an account is deleted is still to decide; today they are deleted with it.
- **Server-side cleanup of orphan photo files.** The app deletes an item's files before the item, but a failure in between leaves files with no row. A scheduled job should remove files that no `item_photos` row points to.
- **Confirm on a device that uploaded photos carry no location data.** The app re-encodes every photo before upload, which should drop what the camera wrote; this has to be checked on real files from a real phone. The publish function must not trust the app for it: it sends the marketplaces only the re-encoded files from the bucket, never a file the app hands it directly.
- **Terms and privacy policy pages:** the entry screen mentions them; they need real pages and links.
- **Sign in with Apple and Google:** shown as "em breve" until the developer accounts exist.
