# Asset register

Raster and icon assets shipped by the app, with where they came from. Generation prompts are also embedded in each file (PNG tEXt) or in a `.json` sidecar next to it (WebP).

| File | Used in | Origin | Date |
|---|---|---|---|
| `public/images/counter-hall-768.webp` | Empty state key art (desktop), source for OG image | Generated with GPT Image 2 (ChatGPT plan via local Codex CLI), 1536x1024 PNG, resized to 768px WebP q78 with `cwebp` | 2026-09-24 |
| `public/images/empty-history.webp` | Conversation drawer empty state | Generated with GPT Image 2 (same route), 1254px PNG, cropped and resized to 320px WebP q80 | 2026-09-24 |
| `public/og.png` | Open Graph / Twitter card (1200x630) | Composited in the browser from HTML/CSS: Gothic A1 and DotGothic16 text set in code over the counter-hall key art; quantized to PNG8 | 2026-09-24 |
| `app/icon.svg` | App icon | Hand-authored SVG (ticket, LED dot, three wayfinding lines) | 2026-09-24 |
| `app/favicon.ico` | Browser favicon | Rasterized from `app/icon.svg` with ImageMagick (16/32/48) | 2026-09-24 |

Alt text lives with the markup: the key art has a descriptive Korean `alt`; the drawer illustration is decorative (`alt=""`) because the adjacent text states the empty state.

No stock photography, no third-party brand marks, no people depicted.
