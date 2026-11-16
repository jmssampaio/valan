# UI and UX rules

## Design system
- Use only the project's tokens (colors, typography, spacing, radii). Never hardcode values in a screen.
- Spacing in multiples of 4. Type uses the three faces under "Visual identity", nothing else.
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
- Confirm before destructive actions or actions that involve money.

## Visual identity (anti-generic rules)

Point of view: Valan feels like a record shop counter run by someone who knows the catalogue, not a SaaS dashboard. Warm, specific, a little editorial.

Palette: one accent (orange from the logo), one ink colour, one paper colour, and the neutrals already in `theme.ts` (surface, muted, line); do not add more. Success and error are for status only. No gradients. Every colour used must be a named token in `theme.ts`. Controls (fields, buttons, chips, segmented controls) are edged with ink; the hairline is for dividers only.

Type: three faces, each with one job. Fraunces SemiBold (600) for titles and prices; Inter (400 to 700) for reading text and controls; IBM Plex Mono (400, 500) for labels, tags and catalogue numbers. Weights come from the font file named in `theme.ts`, never from `fontWeight`. Titles use tight tracking, body text uses normal tracking.

Shape and depth: one corner radius for controls and cards (`Radius.control`, 10); tags and other small marks use `Radius.tag` (4). No other radii. No shadows of our own; native sheets and menus keep the system's. Cards are separated by spacing and a hairline, not by shadows.

Icons: no generic line-icon sets. Use the wave mark and text labels; if an icon is needed, it is drawn for Valan. Exception: system UI (navigation bar, native actions such as share and close) uses SF Symbols through `expo-symbols`, so it looks and behaves like iOS. The tab bar is text only.

Imagery: real sleeve photos from the listing, shown at their true proportions. Empty states use a simple drawn gesture, not a stock illustration.

Layout: break the grid on purpose in at most one place per screen (for example the listings summary). Vary density: the offers inbox is dense, the publish flow is spacious.

Copy: short and direct, in every language. No exclamation marks, no "Get started", no "Unlock the power of" (or their equivalents).

Review: before a screen is done, the author names the one decision that makes it Valan, and the reviewer checks that decision is visible.

## Checks before a screen is done
1. View it in the simulator on a small and a large screen, and with larger text.
2. Go through the list above, law by law.
3. Compare it with its mockup in `docs/design/mockups/` (the source of truth; Figma is no longer used).
4. Name the one decision that makes the screen Valan, and check it is visible.
