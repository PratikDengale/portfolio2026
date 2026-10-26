// Upload rules shared by the admin UI (client-side checks) and the API.
export const VIDEO_TYPES = ['video/mp4', 'video/quicktime', 'video/webm']
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']

// Videos go to Bunny Stream, which re-encodes them to 720p for the site, so
// the upload can be a good-quality master.
export const MAX_VIDEO_BYTES = 2 * 1024 * 1024 * 1024
// Images pass through a Vercel function, which accepts request bodies of up
// to 4.5 MB.
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024

export const EXTENSIONS = {
  'video/mp4': '.mp4',
  'video/quicktime': '.mov',
  'video/webm': '.webm',
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/avif': '.avif',
}

// Lower-case, URL-safe file name without its extension.
export const safeBaseName = (name) =>
  name
    .replace(/\.[^.]*$/, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60) || 'file'

export const SLOT_ID = /^[a-z0-9][a-z0-9/-]{0,63}$/
