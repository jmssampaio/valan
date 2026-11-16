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

## Checks before a screen is done
1. View it in the simulator on a small and a large screen, and with larger text.
2. Go through the list above, law by law.
3. Compare it with the Figma mockup.
