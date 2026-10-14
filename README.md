# Pratik Dengale — portfolio

Single-page portfolio (design "1z") with a password-protected media manager at `/admin`.
Vite + React, plain JavaScript, CSS Modules. Hosted on Vercel.

```bash
npm install
npm run dev      # site + /admin + API, all local
npm run build    # production build in dist/
npm run preview  # serve the production build (also with /admin + API)
npm run lint
```

## Media manager (`/admin`)

Every video, image and logo on the home page is a slot that can be filled, replaced or removed at `/admin`: the hero showreel, the nine work tiles, the three service cards, the twelve client logos (with their names) and the portrait. Empty slots show the hatched placeholder on the site.

Changes are staged in the browser and nothing is uploaded or shown on the site until **Publish**. The live site picks up a publish within a minute or two.

- Video: MP4 (H.264) or WebM, up to 25 MB (flagged above 10 MB). Images: JPG, PNG, WebP or AVIF, up to 5 MB. Logos can also be SVG.
- Every visitor downloads the published media, and on Vercel every download counts toward the Blob store's monthly data-transfer allowance. Compress for the web: a 1080p H.264 clip at 3–5 Mbit/s with no audio track is a few MB. The admin shows each file's size and the page's total.
- A video slot takes a clip and a poster/still. The poster shows before the clip plays; a slot with only a still shows as an image.
- Crop media to the ratio shown on each card; it is fitted with `object-fit: cover`.
- Work tiles, service cards and the portrait have an optional caption: the small text at the bottom-left of the tile. An empty slot shows it over the placeholder; a filled slot shows text only if a caption is set.
- Replaced and removed files are deleted from storage on publish.

### Setting it up on Vercel (once)

1. **Storage:** in the Vercel project, open **Storage → Create → Blob**, make the store **public**, and connect it to the project. This adds `BLOB_READ_WRITE_TOKEN` to the project's environment.
2. **Password:** under **Settings → Environment Variables**, add `ADMIN_PASSWORD` with a long, unique password.
3. **Redeploy** so both variables take effect.

Until `ADMIN_PASSWORD` is set, `/admin` is switched off. Changing the password signs everyone out.

### Running it locally

```bash
cp .env.example .env.local   # then set ADMIN_PASSWORD
npm run dev                  # http://localhost:5173/admin
```

With no `BLOB_READ_WRITE_TOKEN`, uploads are kept on disk in `.cms/` (git-ignored) and never touch the live site. To work against the real store, put the token from Vercel in `.env.local`.

## How it fits together

| Path | What it is |
|---|---|
| `src/data/content.js` | All copy, plus the list of media slots |
| `src/admin/` | The media manager UI (a second page, built to `dist/admin/`) |
| `middleware.js` | Vercel Routing Middleware: requires a session for `/admin` and `/api/admin/*` |
| `api/login.js`, `api/logout.js` | Sign in (sets a signed, HttpOnly session cookie) and sign out |
| `api/content.js` | Public: which file fills which slot; the site fetches this on load |
| `api/admin/content.js` | Read and publish the content document |
| `api/admin/upload.js` | Issues short-lived tokens so the browser can upload straight to Blob |
| `api/_lib/` | Session signing and storage (Vercel Blob, or `.cms/` locally) |
| `dev/vercel-emulator.js` | Dev only: runs the middleware and API inside Vite |

The content document is `cms/content.json` in the Blob store; uploaded files live under `media/<slot>/`.

## Editing copy

Text, links and the slot list live in `src/data/content.js`.
Still to fill in: the WhatsApp URL in `site.socials` (currently a `REPLACE` placeholder).

The social-preview image (`og:image` in `index.html`) is static and not managed by the CMS: put a `reel-2026.jpg` in `public/media/`, and make the URL absolute once the site has a domain.
