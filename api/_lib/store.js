import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { BlobPreconditionFailedError, del, get, put } from '@vercel/blob'

// Where the CMS keeps its data.
//
// On Vercel everything lives in the project's Blob store: uploaded files under
// media/, and one JSON document (cms/content.json) that says which file fills
// which slot on the page.
//
// Without a Blob token (local development) the same data is kept on disk in
// .cms/ and served by the dev server from /_cms/.

const CONTENT_PATH = 'cms/content.json'
export const LOCAL_DIR = path.resolve('.cms')
export const LOCAL_URL = '/_cms/'

export class StoreError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function storageKind() {
  if (process.env.BLOB_READ_WRITE_TOKEN || process.env.BLOB_STORE_ID) return 'blob'
  if (process.env.VERCEL) {
    throw new StoreError('No Blob store is connected to this Vercel project yet.', 503)
  }
  return 'local'
}

// How the browser gets a file into storage: 'token' (a client token minted
// from the read-write token), 'presigned' (a store connected without one), or
// 'local' (the dev server writes it to .cms/).
export function uploadMode() {
  if (storageKind() === 'local') return 'local'
  return process.env.BLOB_READ_WRITE_TOKEN ? 'token' : 'presigned'
}

const empty = () => ({ media: {} })

// `fresh` skips the CDN cache; the admin always needs the latest saved copy.
// The etag identifies the version that was read, for conflict detection on save.
export async function readContent({ fresh = false } = {}) {
  if (storageKind() === 'local') {
    const text = await readFile(path.join(LOCAL_DIR, 'content.json'), 'utf8').catch(() => null)
    const content = text ? JSON.parse(text) : empty()
    return { content, etag: content.updatedAt ?? null }
  }
  const result = await get(CONTENT_PATH, { access: 'public', useCache: !fresh })
  if (!result) return { content: empty(), etag: null }
  return { content: await new Response(result.stream).json(), etag: result.blob.etag }
}

// Saves the document, refusing if it changed since `etag` was read.
export async function writeContent(content, etag) {
  const conflict = () =>
    new StoreError('The content was changed somewhere else. Reload the page and try again.', 409)

  if (storageKind() === 'local') {
    const current = await readContent()
    if (etag && current.etag !== etag) throw conflict()
    await mkdir(LOCAL_DIR, { recursive: true })
    await writeFile(path.join(LOCAL_DIR, 'content.json'), JSON.stringify(content, null, 2))
    return content.updatedAt
  }
  try {
    const blob = await put(CONTENT_PATH, JSON.stringify(content), {
      access: 'public',
      addRandomSuffix: false,
      allowOverwrite: true,
      contentType: 'application/json',
      cacheControlMaxAge: 60,
      ...(etag ? { ifMatch: etag } : {}),
    })
    return blob.etag
  } catch (error) {
    if (error instanceof BlobPreconditionFailedError) throw conflict()
    throw error
  }
}

// True for URLs of files uploaded through the CMS; nothing else may be saved
// into the content document.
function isOwnMedia(url) {
  if (typeof url !== 'string') return false
  if (storageKind() === 'local') return url.startsWith(`${LOCAL_URL}media/`) && !url.includes('..')
  try {
    const { protocol, hostname, pathname } = new URL(url)
    return (
      protocol === 'https:' &&
      hostname.endsWith('.blob.vercel-storage.com') &&
      pathname.startsWith('/media/')
    )
  } catch {
    return false
  }
}

export const mediaUrls = (content) =>
  Object.values(content.media ?? {}).flatMap(({ video, image }) => [video, image].filter(Boolean))

export async function removeMedia(urls) {
  if (!urls.length) return
  if (storageKind() === 'local') {
    await Promise.all(
      urls.map((url) => rm(path.join(LOCAL_DIR, url.slice(LOCAL_URL.length)), { force: true })),
    )
    return
  }
  await del(urls)
}

// Rebuilds a content document from untrusted input, keeping only what the
// site understands: per slot an optional video and image (with their sizes),
// caption and name.
export function sanitizeContent(input) {
  const invalid = (message) => new StoreError(message, 400)
  const entries = Object.entries(input?.media ?? {})
  if (entries.length > 200) throw invalid('Too many media slots.')

  const media = {}
  for (const [slot, value] of entries) {
    if (!/^[a-z0-9][a-z0-9/-]{0,63}$/.test(slot)) throw invalid(`Invalid slot "${slot}".`)
    const entry = {}
    for (const field of ['video', 'image']) {
      if (!value?.[field]) continue
      if (!isOwnMedia(value[field])) throw invalid(`Slot "${slot}" points at a file outside the media store.`)
      entry[field] = value[field]
    }
    // File sizes, as reported by the admin when it uploaded them.
    for (const field of ['videoSize', 'imageSize']) {
      const size = value?.[field]
      if (entry[field.replace('Size', '')] && Number.isSafeInteger(size) && size > 0) entry[field] = size
    }
    for (const field of ['name', 'caption']) {
      const text = typeof value?.[field] === 'string' ? value[field].trim().slice(0, 80) : ''
      if (text) entry[field] = text
    }
    if (Object.keys(entry).length) media[slot] = entry
  }
  return { media, updatedAt: new Date().toISOString() }
}
