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

- **Videos** (MP4, MOV or WebM, up to 2 GB) go to **Bunny Stream**, which re-encodes them; the site plays each one as a 720p MP4. Upload a good-quality export, with sound if the clip has any. After uploading, Bunny needs a few minutes to encode, and the admin waits for it, so keep the page open until Publish finishes.
- **Images** (JPG, PNG, WebP or AVIF, up to 4 MB; logos can also be SVG) go to **Bunny Storage**.
- A video slot takes a clip and an optional poster. Without a poster, the frame Bunny picks is shown before the clip plays; a slot with only a still shows as an image.
- Crop media to the ratio shown on each card; it is fitted with `object-fit: cover`.
- Work tiles, service cards and the portrait have an optional caption: the small text at the bottom-left of the tile. An empty slot shows it over the placeholder; a filled slot shows text only if a caption is set.
- Replaced and removed files are deleted from Bunny on publish.

On the site, every video has play/pause and sound buttons (top-left of the hero, bottom-right of tiles; on desktop the tile buttons appear on hover). Videos play muted while on screen; sound needs a click, only one video has sound at a time, and a video pauses when scrolled away. With Reduce Motion on, nothing autoplays.

### Setting it up (once)

**On bunny.net**

1. **Stream video library.** Under encoding, turn **MP4 Fallback** on (before uploading anything) and tick **720p**. Under security, add the site's domain and `localhost` to the allowed domains; leave "block direct URL access" and token authentication off.
2. **Storage zone** (e.g. `pratik-media`) with a **pull zone** connected to it (e.g. `pratikmedia.b-cdn.net`). Add the same allowed referrers to the pull zone.

**On Vercel**, under **Settings → Environment Variables**:

| Variable | Value |
|---|---|
| `ADMIN_PASSWORD` | Password for `/admin`; long and unique |
| `BUNNY_STREAM_LIBRARY_ID` | Stream library → API: Library ID |
| `BUNNY_STREAM_API_KEY` | Stream library → API: API key |
| `BUNNY_STREAM_CDN_HOST` | Stream library → API: CDN hostname, e.g. `vz-xxxx.b-cdn.net` |
| `BUNNY_STORAGE_ZONE` | Storage zone name, e.g. `pratik-media` |
| `BUNNY_STORAGE_PASSWORD` | Storage zone → FTP & API Access: password |
| `BUNNY_STORAGE_HOST` | Storage API host for the zone's main region: `storage.bunnycdn.com` for Falkenstein/Frankfurt, otherwise e.g. `sg.storage.bunnycdn.com` |
| `BUNNY_STORAGE_CDN_HOST` | The pull zone's hostname, e.g. `pratikmedia.b-cdn.net` |

Then redeploy. Until `ADMIN_PASSWORD` is set, `/admin` is switched off; changing it signs everyone out. If some Bunny variables are missing or wrong, `/admin` names which.

### Running it locally

```bash
cp .env.example .env.local   # then set ADMIN_PASSWORD
npm run dev                  # http://localhost:5173/admin
```

With no Bunny variables, uploads are kept on disk in `.cms/` (git-ignored) and never touch the live site; videos are played as uploaded, without encoding. To work against the real Bunny account, put all the Bunny variables in `.env.local`.

## How it fits together

| Path | What it is |
|---|---|
| `src/data/content.js` | All copy, plus the list of media slots |
| `src/hooks/useVideoPlayback.js` | Play/pause, sound and on-screen rules for every video |
| `src/admin/` | The media manager UI (a second page, built to `dist/admin/`) |
| `middleware.js` | Vercel Routing Middleware: requires a session for `/admin` and `/api/admin/*` |
| `api/login.js`, `api/logout.js` | Sign in (sets a signed, HttpOnly session cookie) and sign out |
| `api/content.js` | Public: which file fills which slot; the site fetches this on load |
| `api/admin/content.js` | Read and publish the content document; deletes media no longer used |
| `api/admin/video.js` | Creates a Bunny Stream video and signs the browser's upload; reports encoding progress |
| `api/admin/image.js` | Receives an image and stores it in Bunny Storage |
| `api/_lib/` | Session signing, and storage (bunny.net, or `.cms/` locally) |
| `dev/vercel-emulator.js` | Dev only: runs the middleware and API inside Vite |

The content document is `cms/content.json` in the Bunny storage zone; images live under `media/<slot>/` there, and videos in the Stream library.

## Editing copy

Text, links and the slot list live in `src/data/content.js`.
Still to fill in: the WhatsApp URL in `site.socials` (currently a `REPLACE` placeholder).

The social-preview image (`og:image` in `index.html`) is static and not managed by the CMS: put a `reel-2026.jpg` in `public/media/`, and make the URL absolute once the site has a domain.
