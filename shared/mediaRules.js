// Upload rules shared by the admin UI (client-side checks) and the upload API
// (enforced in the upload permission).
export const VIDEO_TYPES = ['video/mp4', 'video/webm']
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const LOGO_TYPES = [...IMAGE_TYPES, 'image/svg+xml']

// Every visitor downloads these files, and every download counts toward the
// Blob store's monthly transfer allowance, so the limits are set for the web
// rather than for masters: a well-encoded 1080p clip is a few MB.
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024
export const MAX_IMAGE_BYTES = 5 * 1024 * 1024
// Above this a video still uploads, but the admin flags it as heavy.
export const LARGE_VIDEO_BYTES = 10 * 1024 * 1024

export const isVideoPath = (pathname) => /\.(mp4|webm)$/i.test(pathname)
