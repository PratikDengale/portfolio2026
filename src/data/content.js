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

// Masonry is authored as 3 explicit columns so every column ends level
// (each column holds one 16:9, one 9:16, one 1:1). Do NOT use CSS columns.
const work = [
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
]

const services = [
  { slot: 'service/cinematography', title: 'Cinematography' },
  { slot: 'service/color-grading', title: 'Color Grading' },
  { slot: 'service/photography', title: 'Photography' },
]

const pad = (n) => String(n).padStart(2, '0')

// An empty tile is captioned with its number within its section: 01, 02, …
// Work is counted down each authored column in turn.
const numbers = new Map(
  [work.flat(), services].flatMap((items) => items.map(({ slot }, i) => [slot, pad(i + 1)])),
)

const clients = Array.from({ length: 12 }, (_, i) => ({
  slot: `logo/${pad(i + 1)}`,
  name: `Client ${i + 1}`,
}))

export const about = {
  body: 'I craft visual stories with a distinct perspective, combining technical expertise with a strong artistic vision. From the way light falls to the rhythm of a moving frame, every detail serves a purpose: to create images that captivate, connect, and leave a lasting impression.',
  meta: [
    { k: 'Roles', v: 'Cinematographer / Colorist / Drone Pilot' },
    { k: 'Social', v: 'Instagram / Vimeo' },
  ],
}

// Every slot the admin can fill. `accepts` is what a slot takes: 'video'
// (a clip plus a poster/still), 'image', or 'logo' (an image plus a name).
// Slots with a `caption` can have their tile text edited; the value here is
// the default shown while the slot is empty.
export const slots = [
  { id: 'reel', group: 'Hero', label: 'Showreel', ratio: '16/9', accepts: 'video' },
  ...work.flat().map(({ slot, label, ratio }) => ({
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
  ...clients.map(({ slot, name }) => ({ id: slot, group: 'Client logos', label: name, accepts: 'logo' })),
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
    work: work.map((column) =>
      column.map((item) => ({ ...item, label: numbers.get(item.slot), ...clip(item.slot) })),
    ),
    services: services.map((item) => ({ ...item, label: numbers.get(item.slot), ...clip(item.slot) })),
    clients: clients.map(({ slot, name }) => ({
      slot,
      name: entry(slot).name ?? name,
      logo: entry(slot).image ?? null,
    })),
    portrait: { src: entry('portrait').image ?? null, caption: entry('portrait').caption ?? null },
  }
}
