// Copy and structure for the page.
//
// Media files are not stored here. Every media position on the page is a
// "slot" with an id; the files that fill the slots are managed at /admin and
// merged in at runtime by resolveContent(). An empty slot renders the hatched
// placeholder tile.

export const site = {
  name: 'Pratik Dengale',
  roles: ['Cinematographer', 'Colorist', 'Photographer'], // hero order, left→right
  email: 'pratikdengle10@gmail.com',
  status: 'Open for projects',
  socials: {
    instagram: 'https://instagram.com/pratik_d10',
    instagramHandle: 'pratik_d10',
    whatsapp: 'https://wa.me/REPLACE_WITH_NUMBER',
  },
}

// Masonry is authored as blocks of 3 explicit columns, stacked top to
// bottom. Within a block every column holds the same mix of ratios, so the
// columns end level. Do NOT use CSS columns. A slot id is where its media is
// saved: never rename one that has media (publishing drops unknown slots).
const work = [
  // Each column: one 16:9, one 9:16, one 1:1.
  [
    [
      { slot: 'work/fashion-film', ratio: '16/9', label: 'fashion film', alt: 'Fashion film' },
      { slot: 'work/beauty-vertical', ratio: '9/16', label: 'beauty vertical', alt: 'Beauty vertical' },
      { slot: 'work/lookbook-loop', ratio: '1/1', label: 'lookbook loop', alt: 'Lookbook loop' },
    ],
    [
      { slot: 'work/editorial', ratio: '1/1', label: 'editorial', alt: 'Editorial' },
      { slot: 'work/aerial-tracking', ratio: '16/9', label: 'aerial tracking', alt: 'Aerial tracking shot' },
      { slot: 'work/social-cut', ratio: '9/16', label: 'social cut', alt: 'Social cut' },
    ],
    [
      { slot: 'work/swimwear-vertical', ratio: '9/16', label: 'swimwear vertical', alt: 'Swimwear vertical' },
      { slot: 'work/product-loop', ratio: '1/1', label: 'product loop', alt: 'Product loop' },
      { slot: 'work/brand-film', ratio: '16/9', label: 'brand film', alt: 'Brand film' },
    ],
  ],
  // Each column: one 16:9, one 9:16, ordered so no ratio sits on itself and
  // neighbouring columns break at different heights.
  [
    [
      { slot: 'work/event-vertical', ratio: '9/16', label: 'event vertical', alt: 'Event film, vertical' },
      { slot: 'work/music-video', ratio: '16/9', label: 'music video', alt: 'Music video' },
    ],
    [
      { slot: 'work/campaign-film', ratio: '16/9', label: 'campaign film', alt: 'Campaign film' },
      { slot: 'work/music-vertical', ratio: '9/16', label: 'music vertical', alt: 'Music video, vertical' },
    ],
    [
      { slot: 'work/campaign-vertical', ratio: '9/16', label: 'campaign vertical', alt: 'Campaign film, vertical' },
      { slot: 'work/event-film', ratio: '16/9', label: 'event film', alt: 'Event film' },
    ],
  ],
]

const services = [
  { slot: 'service/cinematography', title: 'Cinematography' },
  { slot: 'service/color-grading', title: 'Color Grading' },
  { slot: 'service/photography', title: 'Photography' },
]

const pad = (n) => String(n).padStart(2, '0')

// An empty tile is captioned with its number within its section: 01, 02, …
// Work is counted block by block, down each authored column in turn.
const numbers = new Map(
  [work.flat(2), services].flatMap((items) => items.map(({ slot }, i) => [slot, pad(i + 1)])),
)

// Client logos are fixed files in public/clients/, not CMS slots, shown in
// their own colours on the dark page. Use SVG or a transparent PNG, and swap
// any colour too dark to read there (under 3:1 against --bg, like black or
// navy) for --ink, as a brand's reversed logo does. A client without a logo
// shows its name. `height` (px, default 28) balances the marks by eye: wide
// wordmarks go smaller, compact marks larger.
export const clients = [
  { name: 'YouTube FanFest', logo: '/clients/youtube-fanfest.png', height: 22 },
  { name: 'Puma', logo: '/clients/puma.svg', height: 36 },
  { name: 'H&M', logo: '/clients/hm.svg', height: 34 },
  { name: 'Black & White', logo: '/clients/black-and-white.png', height: 22 },
  { name: 'Jameson', logo: '/clients/jameson.png', height: 30 },
  { name: 'Ajio', logo: '/clients/ajio.svg', height: 22 },
  { name: 'Simba', logo: '/clients/simba.png', height: 24 },
  { name: 'TVS', logo: '/clients/tvs.svg', height: 24 },
  { name: 'Saregama', logo: '/clients/saregama.png', height: 40 },
  { name: 'Amazon Music', logo: '/clients/amazon-music.svg', height: 26 },
]

export const about = {
  body: 'I craft visual stories with a distinct perspective, combining technical expertise with a strong artistic vision. From the way light falls to the rhythm of a moving frame, every detail serves a purpose: to create images that captivate, connect, and leave a lasting impression.',
  meta: [
    { k: 'Roles', v: 'Cinematographer / Colorist / Drone Pilot' },
    { k: 'Social', v: 'Instagram / Vimeo' },
  ],
}

// Every slot the admin can fill. `accepts` is what a slot takes: 'video'
// (a clip plus a poster/still) or 'image'.
// Slots with a `caption` can have their tile text edited; the value here is
// the default shown while the slot is empty.
export const slots = [
  { id: 'reel', group: 'Hero', label: 'Showreel', ratio: '16/9', accepts: 'video' },
  ...work.flat(2).map(({ slot, label, ratio }) => ({
    id: slot,
    group: 'Selected work',
    label,
    ratio,
    accepts: 'video',
    caption: numbers.get(slot),
  })),
  ...services.map(({ slot, title }) => ({
    id: slot,
    group: 'Services',
    label: title,
    ratio: '4/3',
    accepts: 'video',
    caption: numbers.get(slot),
  })),
  { id: 'portrait', group: 'About', label: 'Portrait', ratio: '4/5', accepts: 'image', caption: 'portrait' },
]

// Merges the saved CMS document (see api/content.js) into the page structure.
export function resolveContent(manifest) {
  const entry = (slot) => manifest?.media?.[slot] ?? {}
  // A video's poster is the uploaded still, or else the frame Bunny picked.
  const clip = (slot) => ({
    src: entry(slot).video ?? null,
    poster: entry(slot).image ?? entry(slot).thumbnail ?? null,
    caption: entry(slot).caption ?? null,
  })

  return {
    reel: clip('reel'),
    work: work.map((block) =>
      block.map((column) =>
        column.map((item) => ({ ...item, label: numbers.get(item.slot), ...clip(item.slot) })),
      ),
    ),
    services: services.map((item) => ({ ...item, label: numbers.get(item.slot), ...clip(item.slot) })),
    portrait: { src: entry('portrait').image ?? null, caption: entry('portrait').caption ?? null },
  }
}
