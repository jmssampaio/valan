# Valan design

Source of truth for screens: the Figma file "Valan — Mockups v1.0" (page "Mockups v1.0"; flows on "Fluxos"; logo on "Logo").

## Logo
- `valan-icon.svg`: app icon. Orange tile `#B4460F` with cream wave `#F5EFE6`.
- `valan-lockup.svg`: icon with the VALAN wordmark below (Inter Bold, tracking 0.32 em at 26 px in the mockups).

The wave path is `M12 60 24 46 38 80 54 26 66 94 82 40 96 74 108 60`, stroke 9.5, round caps and joins.

## Colour
- Accent: orange `#B4460F` (5.5:1 with white text, passes WCAG AA).
- Cream `#F5EFE6` for the icon stroke and paper background, ink `#1E1A17` for text.

## Mockups (v2)
`mockups/` holds the current screens, 390 x 844 at 2x: `01-entrada.png` to `12-subscricao.png`, plus `03b-anuncios-vazio.png` (empty state) and `00-visao-geral.png` (all screens). `mockups/valan-mockups-v2.html` is the source, with every token as a CSS variable at the top. These replace the Figma file as the reference for building screens.

Tokens: paper `#F5EFE6`, surface `#FBF8F3`, ink `#1E1A17`, muted `#6B6259`, hairline `#D8CEBF`, accent `#B4460F`, success `#2C6A3F`, error `#A12A1E`. One radius: 10. No shadows, no gradients.

Type: Fraunces 600 for titles and prices, Inter for text, IBM Plex Mono for labels, tags and catalogue numbers. These fonts are not installed in the app yet.

Not designed yet: loading, offline and error states for each screen, the Aparelho (equipment) path of the new-listing flow, the email sign-in form, and the delete-account confirmation. The sleeve squares are stand-ins for the seller's photos. Apple and Google buttons are text only here; the app must use the official button assets.
