# UI and UX rules

## Design system
- Use only the project's tokens (colors, typography, spacing, radii). Never hardcode values in a screen.
- Spacing in multiples of 4. Type uses the two faces under "Visual identity", nothing else.
- Minimum contrast 4.5:1 for text; 3:1 for icons and large text.
- Support the system text size setting; no text below 12 pt.

## The five laws
- Fitts: touch targets at least 44×44 pt; primary action within thumb reach.
- Hick: one primary action per screen; at most 5 to 7 options visible at once.
- Zeigarnik: multi-step flows show progress and save a draft.
- Jakob: use the platform's native patterns (navigation, gestures, sheets, alerts).
- Von Restorff: a single highlighted element per screen.

## Required states on every screen
Empty, loading, error (with a way to retry), offline, and success.

## Copy
- Short sentences, in the user's voice. Buttons use a verb ("Publish", not "OK").
- Errors say what happened and what to do next.
- The app speaks European Portuguese (`pt-PT`), Spanish and English. No user-facing text is written in a screen: every string lives in `src/i18n/locales/`, in all three languages; `pt-PT` is the source.
- Confirm before actions that cannot be undone or that commit the seller to a sale: accepting an offer, removing a listing, deleting the account. Publishing is not one of them: the price step is the review, its button says exactly what happens ("Publicar em 2 plataformas"), and a listing can be removed afterwards.

## Visual identity (design v3)

The values come from `docs/design/v3/design-spec.md`, which has the detail of every component and screen. `src/constants/theme.ts` and the components still carry design v2 (Fraunces, IBM Plex Mono, one radius of 10, a text-only tab bar) until they are migrated.

Point of view: Valan is calm and exact. One job per screen, and the state of every listing on every marketplace always in sight: the marketplace chip (published, paused, error, sold, off) is the mark of the app, more than any decoration. It should read as a tool made for this trade, not a generic dashboard.

Palette: a warm page (`bg`), white (`surface`) for cards, lists and fields, `fill` for secondary buttons and the segmented control, `line` for the contour of cards and for dividers, `ink` and `muted` for text. One accent, the orange of the logo (`primary`, with `primaryPressed` and `primaryTint`); it is also the colour of "published". `cream` exists only inside the app icon. `danger` (with `dangerTint`) is for errors and destructive actions (remove, delete the account), never for decoration. `badge` is only the counter on the Propostas tab, and `chart3` only a series in a chart, never text. No gradients. Every colour used must be a named token in `theme.ts`; do not add more. `line` is too faint to be the only edge of a control: a field or an unticked box gets a darker edge, as in the mockups, so it reaches 3:1.

Type: two faces, each with one job. Space Grotesk SemiBold (600) for titles and big numbers: the title of a screen, the summary figures, the sales total, the price field and the one number a card or screen is about (the price on an item's own screen, the offered price on an offer card). Inter (400 to 700) for everything else: reading text, controls, labels, seals, the wordmark of the logo and prices in scanning lists (with tabular figures, so stacked amounts line up). No third face. Weights come from the font file named in `theme.ts`, never from `fontWeight`. Titles use tight tracking, body text uses normal tracking.

Shape: the radius depends on the element. 8 for seals and chips; 10 for small controls (the options of a segmented control, a tick box); 14 for fields and buttons; 16 for cards. Filter pills are fully rounded. No other radii, except the app icon and the tile behind the wave in empty and publishing states, whose proportions are in the spec.

Depth: a card is a `surface` with a 1 pt `line` contour and radius 16; the rows inside it are separated by a 1 pt divider. Cards are told apart by that line and by spacing, not by shadows. No shadows of our own, with one exception from the spec: the light shadow under the active option of a segmented control. Native sheets and menus keep the system's.

Icons: only in the tab bar (one for each tab, above its label) and in inline actions (back, close, search inside a field, the chevron of a row, open on the marketplace, add). They come from SF Symbols through `expo-symbols`, so they look and behave like iOS; where the spec names an icon, use the SF Symbol with the same meaning. No other icon set and no decorative icons. An icon that stands for an action without a text label still has a 44×44 pt target and an accessibility label.

Logo: one form only, the `Logo` component: the app icon at 40 pt with "VALAN" in Inter Bold 18, letter-spacing 32 %, in ink, 12 pt apart. It has the same size on every screen where it appears. No other variants, no other product name beside it, and the icon never alone inside the app. The wave on its own is a drawing, not the logo: it is what the entry screen, the empty states and the publishing screen use.

Imagery: real photos of the item, from the listing. Empty and error states use the wave on a `primaryTint` tile, not a stock illustration.

Layout: the primary action sits at the bottom, full width. The large title is for the four tabs and the connect screen only.

Copy: short and direct, in every language. No exclamation marks, no "Get started", no "Unlock the power of" (or their equivalents).

Review: before a screen is done, the author names the one decision that makes it Valan, and the reviewer checks that decision is visible.

## Checks before a screen is done
1. View it in the simulator on a small and a large screen, and with larger text.
2. Go through the list above, law by law.
3. Compare it with its section of `docs/design/v3/design-spec.md` and its picture beside it (the spec is the source of truth; where it disagrees with a decision in CLAUDE.md, the decision stands).
4. Name the one decision that makes the screen Valan, and check it is visible.
