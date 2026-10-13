# Pratik Dengale — portfolio

Single-page portfolio (design "1z"). Vite + React, plain JavaScript, CSS Modules.

```bash
npm install
npm run dev      # local dev server
npm run build    # production build in dist/
npm run preview  # serve the production build
npm run lint
```

## Editing content

All copy, links and media references live in `src/data/content.js`.
Still to fill in: the WhatsApp URL in `site.socials` (currently a `REPLACE` placeholder).

## Adding media

Drop files into `public/media/` using the names below. Anything missing shows a hatched placeholder tile, so files can be added one at a time. The dev server reloads when a file is added or removed; a production build needs to be re-run.

| What | File name |
|---|---|
| Hero reel | `reel-2026.mp4` (+ optional `reel-2026.webm`), poster `reel-2026.jpg` |
| Work tiles | `work-<name>.mp4` (+ optional `.webm`), poster `work-<name>.jpg` or `.avif` |
| Service cards | `service-cinematography`, `service-color-grading`, `service-photography` — `.jpg` still, or `.mp4` with a `.jpg` poster |
| Client logos | `logo-01.svg` … `logo-12.svg` (rendered monochrome) |
| Portrait | `portrait.jpg` |

Work tile names: `fashion-film`, `beauty-vertical`, `lookbook-loop`, `editorial`, `aerial-tracking`, `social-cut`, `swimwear-vertical`, `product-loop`, `brand-film`. A tile with only a poster image renders as a still.

Video should be H.264 `.mp4`, cropped to the tile's ratio (16:9, 9:16 or 1:1; service cards 4:3; portrait 4:5).

Once the site has a domain, change `og:image` in `index.html` to an absolute URL — social previews ignore relative paths.
