# UI and UX rules

## Design system
- Use only the project's tokens (colors, typography, spacing, radii). Never hardcode values in a screen.
- Spacing in multiples of 4. One font family.
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
- Confirm before destructive actions or actions that involve money.

## Visual identity (anti-generic rules)

Point of view: Valan feels like a record shop counter run by someone who knows the catalogue, not a SaaS dashboard. Warm, specific, a little editorial.

Palette: one accent (orange from the logo), one ink colour, one paper colour. No gradients. No more than three neutrals. Every colour used must be a named token in theme.ts.

Type: one display face with character for titles and one text face for reading. Do not use the system default alone. Titles use tight tracking, body text uses normal tracking.

Shape and depth: one corner radius for the whole app. Shadows are banned except on floating elements. Cards are separated by spacing and a hairline, not by shadows.

Icons: no generic line-icon sets. Use the wave mark and text labels; if an icon is needed, it is drawn for Valan or taken from one consistent set chosen once in the design phase.

Imagery: real sleeve photos from the listing, shown at their true proportions. Empty states use a simple drawn gesture, not a stock illustration.

Layout: break the grid on purpose in at most one place per screen (for example the listings summary). Vary density: the offers inbox is dense, the publish flow is spacious.

Copy: short, direct, plain Portuguese. No exclamation marks, no "Get started", no "Unlock the power of".

Review: before a screen is done, the author names the one decision that makes it Valan, and the reviewer checks that decision is visible.

## Checks before a screen is done
1. View it in the simulator on a small and a large screen, and with larger text.
2. Go through the list above, law by law.
3. Compare it with the Figma mockup.
4. Name the one decision that makes the screen Valan, and check it is visible.
