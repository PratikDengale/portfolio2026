import available from 'virtual:media-manifest'

// Media lives in public/media. Anything that hasn't been dropped in yet
// resolves to null, which renders the hatched placeholder tile.
const present = new Set(available)
const file = (path) => (present.has(path) ? path : null)
const clip = (name) => ({
  src: file(`/media/${name}.mp4`),
  webm: file(`/media/${name}.webm`),
  poster: file(`/media/${name}.avif`) ?? file(`/media/${name}.jpg`),
})

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
  reel: clip('reel-2026'),
}

// Masonry is authored as 3 explicit columns so every column ends level
// (each column holds one 16:9, one 9:16, one 1:1). Do NOT use CSS columns.
export const work = [
  [
    { ratio: '16/9', label: 'fashion film', alt: 'Fashion film', ...clip('work-fashion-film') },
    { ratio: '9/16', label: 'beauty vertical', alt: 'Beauty vertical', ...clip('work-beauty-vertical') },
    { ratio: '1/1', label: 'lookbook loop', alt: 'Lookbook loop', ...clip('work-lookbook-loop') },
  ],
  [
    { ratio: '1/1', label: 'editorial', alt: 'Editorial', ...clip('work-editorial') },
    { ratio: '16/9', label: 'aerial tracking', alt: 'Aerial tracking shot', ...clip('work-aerial-tracking') },
    { ratio: '9/16', label: 'social cut', alt: 'Social cut', ...clip('work-social-cut') },
  ],
  [
    { ratio: '9/16', label: 'swimwear vertical', alt: 'Swimwear vertical', ...clip('work-swimwear-vertical') },
    { ratio: '1/1', label: 'product loop', alt: 'Product loop', ...clip('work-product-loop') },
    { ratio: '16/9', label: 'brand film', alt: 'Brand film', ...clip('work-brand-film') },
  ],
]

export const services = [
  { title: 'Cinematography', media: 'on-set camera bts', ...clip('service-cinematography') },
  { title: 'Color Grading', media: 'edit suite / timeline', ...clip('service-color-grading') },
  { title: 'Photography', media: 'drone in flight', ...clip('service-photography') },
]

export const clients = Array.from({ length: 12 }, (_, i) => ({
  name: `Client ${i + 1}`,
  logo: file(`/media/logo-${String(i + 1).padStart(2, '0')}.svg`),
}))

export const about = {
  body: 'I craft visual stories with a distinct perspective, combining technical expertise with a strong artistic vision. From the way light falls to the rhythm of a moving frame, every detail serves a purpose: to create images that captivate, connect, and leave a lasting impression.',
  meta: [
    { k: 'Roles', v: 'Cinematographer / Colorist / Drone Pilot' },
    { k: 'Social', v: 'Instagram / Vimeo' },
  ],
  portrait: file('/media/portrait.jpg'),
}
