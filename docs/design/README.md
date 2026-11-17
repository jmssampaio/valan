# Valan design

Source of truth for screens and brand: the mockups in `mockups/` and the logo in `logo/`. The Figma file "Valan — Mockups v1.0" is no longer used.

## Logo
- `valan-icon.svg`: app icon. Orange tile `#B4460F` with cream wave `#F5EFE6`.
- `valan-lockup.svg`: icon with the VALAN wordmark below (Inter Bold, tracking 0.32 em at 26 px in the mockups).

The wave path is `M12 60 24 46 38 80 54 26 66 94 82 40 96 74 108 60`, stroke 9.5, round caps and joins.

## Colour
- Accent: orange `#B4460F` (5.5:1 with white text, passes WCAG AA).
- Cream `#F5EFE6` for the icon stroke only. The page is white `#FFFFFF`, with ink `#1E1A17` for text.

## Mockups (v2)
`mockups/` holds the current screens, 390 x 844 at 2x: `01-entrada.png` to `12-subscricao.png`, plus `03b-anuncios-vazio.png` (empty state) and `00-visao-geral.png` (all screens). `mockups/valan-mockups-v2.html` is the source, with every token as a CSS variable at the top.

Tokens: paper `#FFFFFF`, surface `#FBF8F3`, ink `#1E1A17`, muted `#6B6259`, hairline `#D8CEBF`, accent `#B4460F`, on-accent `#FFFFFF`, on-ink `#FFFFFF`, success `#2C6A3F`, error `#A12A1E`. The mockups still show the earlier cream paper (`#F5EFE6`); the app's values are the ones here. Radius: 10 for controls and cards, 4 for tags. No shadows, no gradients. In code they live in `src/constants/theme.ts`.

Spacing in the app follows the 4-point grid in `docs/standards/ux.md`, so the mockups' off-grid values are snapped: 14 becomes 16, 10 becomes 8 or 12, 6 becomes 8, and tag padding 5/7 becomes 4/8.

Contrast (checked against `docs/standards/ux.md`): ink, muted, accent, success and error all reach at least 4.5:1 on paper and surface; white on accent is 5.5:1. The hairline is 1.6:1 on paper, so it is used for dividers only. Surface is a slight warm tint (1.06:1 against paper), so a field or card is told apart by its ink edge or hairline, not by its fill; controls, including the condition chips, are edged with ink.

Type: Fraunces 600 for titles and prices, Inter (400, 500, 600, 700) for text, IBM Plex Mono (400, 500) for labels, tags and catalogue numbers. They are embedded in the app through the `expo-font` config plugin in `app.json`, so they appear only in a development or production build, not in Expo Go.

Not designed yet: loading, offline and error states for each screen, the Aparelho (equipment) path of the new-listing flow, the email sign-in form, and the delete-account confirmation. The sleeve squares are stand-ins for the seller's photos. Apple and Google buttons are text only here; the app must use the official button assets.

The PNG exports predate two fixes in the HTML: condition chips are edged with ink instead of the hairline, and the caption in the listings summary is 12 px instead of 11 px. Re-export the PNGs from the HTML when convenient.
