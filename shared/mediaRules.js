// Upload rules shared by the admin UI (client-side checks) and the upload API
// (enforced in the upload token).
export const VIDEO_TYPES = ['video/mp4', 'video/webm']
export const IMAGE_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/avif']
export const LOGO_TYPES = [...IMAGE_TYPES, 'image/svg+xml']
export const MAX_UPLOAD_BYTES = 200 * 1024 * 1024
