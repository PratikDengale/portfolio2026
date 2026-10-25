import { createHash, randomBytes } from 'node:crypto'
import { mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { SLOT_ID } from '../../shared/mediaRules.js'

// Where the CMS keeps its data.
//
// Live, everything is on bunny.net:
//   - Bunny Storage holds the images (media/<slot>/…) and one JSON document
//     (cms/content.json) saying which file fills which slot on the page.
//   - Bunny Stream holds the videos and serves each one as a 720p MP4.
//
// Without any Bunny settings (local development) the same data is kept on
// disk in .cms/ and served by the dev server from /_cms/.

const CONTENT_PATH = 'cms/content.json'
export const LOCAL_DIR = path.resolve('.cms')
export const LOCAL_URL = '/_cms/'

const SETTINGS = [
  'BUNNY_STREAM_LIBRARY_ID',
  'BUNNY_STREAM_API_KEY',
  'BUNNY_STREAM_CDN_HOST',
  'BUNNY_STORAGE_ZONE',
  'BUNNY_STORAGE_PASSWORD',
  'BUNNY_STORAGE_HOST',
  'BUNNY_STORAGE_CDN_HOST',
]

const GUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export class StoreError extends Error {
  constructor(message, status) {
    super(message)
    this.status = status
  }
}

export function storageKind() {
  const missing = SETTINGS.filter((name) => !process.env[name])
  if (!missing.length) return 'bunny'
  if (process.env.VERCEL || missing.length < SETTINGS.length) {
    throw new StoreError(`bunny.net isn't fully set up: missing ${missing.join(', ')}.`, 503)
  }
  return 'local'
}

// Hosts are given without a scheme (e.g. vz-123.b-cdn.net); a full URL is
// accepted too, which tests use to point at a stand-in server.
const origin = (host) => (/^https?:\/\//.test(host) ? host : `https://${host}`).replace(/\/+$/, '')

function bunny() {
  const env = process.env
  return {
    libraryId: env.BUNNY_STREAM_LIBRARY_ID,
    streamKey: env.BUNNY_STREAM_API_KEY,
    streamApi: origin(env.BUNNY_STREAM_API_URL || 'video.bunnycdn.com'),
    streamCdn: origin(env.BUNNY_STREAM_CDN_HOST),
    zone: env.BUNNY_STORAGE_ZONE,
    storageKey: env.BUNNY_STORAGE_PASSWORD,
    storageApi: origin(env.BUNNY_STORAGE_HOST),
    storageCdn: origin(env.BUNNY_STORAGE_CDN_HOST),
  }
}

async function ensureOk(response, service, action) {
  if (response.ok) return response
  const hint =
    response.status === 401
      ? ` Check ${service === 'Bunny Stream' ? 'BUNNY_STREAM_LIBRARY_ID and BUNNY_STREAM_API_KEY' : 'BUNNY_STORAGE_ZONE, BUNNY_STORAGE_PASSWORD and BUNNY_STORAGE_HOST'}.`
      : ''
  throw new Error(`${service} could not ${action} (HTTP ${response.status}).${hint}`)
}

function storageRequest(method, filePath, init = {}) {
  const { storageApi, zone, storageKey } = bunny()
  return fetch(`${storageApi}/${zone}/${filePath}`, {
    method,
    ...init,
    headers: { AccessKey: storageKey, ...init.headers },
  })
}

async function streamRequest(method, suffix, action, body) {
  const { streamApi, libraryId, streamKey } = bunny()
  const response = await fetch(`${streamApi}/library/${libraryId}/videos${suffix}`, {
    method,
    headers: {
      AccessKey: streamKey,
      Accept: 'application/json',
      ...(body ? { 'Content-Type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  })
  return ensureOk(response, 'Bunny Stream', action)
}

// ---- The content document ------------------------------------------------

const empty = () => ({ media: {} })

// Always the latest saved copy (the Storage API isn't cached). The etag
// identifies the version that was read, for conflict detection on save.
export async function readContent() {
  let content
  if (storageKind() === 'local') {
    const text = await readFile(path.join(LOCAL_DIR, 'content.json'), 'utf8').catch(() => null)
    content = text ? JSON.parse(text) : empty()
  } else {
    const response = await storageRequest('GET', CONTENT_PATH)
    if (response.status === 404) return { content: empty(), etag: null }
    await ensureOk(response, 'Bunny Storage', 'read the content list')
    content = await response.json()
  }
  return { content, etag: content.updatedAt ?? null }
}

// Saves the document, refusing if it changed since `etag` was read.
export async function writeContent(content, etag) {
  const current = await readContent()
  if ((current.etag ?? null) !== (etag ?? null)) {
    throw new StoreError('The content was changed somewhere else. Reload the page and try again.', 409)
  }
  const text = JSON.stringify(content, null, 2)
  if (storageKind() === 'local') {
    await mkdir(LOCAL_DIR, { recursive: true })
    await writeFile(path.join(LOCAL_DIR, 'content.json'), text)
  } else {
    const response = await storageRequest('PUT', CONTENT_PATH, {
      body: text,
      headers: { 'Content-Type': 'application/json' },
    })
    await ensureOk(response, 'Bunny Storage', 'save the content list')
  }
  return content.updatedAt
}

// ---- Images (Bunny Storage) ----------------------------------------------

// Stores an image under media/<slot>/ with a random suffix (so a new file
// never reuses a cached URL) and returns its public URL.
export async function saveImage(slot, baseName, extension, bytes) {
  const filePath = `media/${slot}/${baseName}-${randomBytes(4).toString('hex')}${extension}`
  if (storageKind() === 'local') {
    const file = path.join(LOCAL_DIR, filePath)
    await mkdir(path.dirname(file), { recursive: true })
    await writeFile(file, bytes)
    return LOCAL_URL + filePath
  }
  const response = await storageRequest('PUT', filePath, {
    body: bytes,
    headers: { 'Content-Type': 'application/octet-stream' },
  })
  await ensureOk(response, 'Bunny Storage', 'save the image')
  return `${bunny().storageCdn}/${filePath}`
}

// ---- Videos (Bunny Stream) -----------------------------------------------

// Creates an empty video in the library and signs a one-day permission for the
// browser to upload its file straight to Bunny (tus resumable upload). The API
// key never leaves the server.
export async function createVideoUpload(title) {
  const { libraryId, streamKey, streamApi } = bunny()
  const response = await streamRequest('POST', '', 'create the video', { title })
  const { guid } = await response.json()
  const expires = Math.floor(Date.now() / 1000) + 24 * 60 * 60
  const signature = createHash('sha256')
    .update(`${libraryId}${streamKey}${expires}${guid}`)
    .digest('hex')
  return { videoId: guid, libraryId, expires, signature, endpoint: `${streamApi}/tusupload` }
}

const FAILED = new Set([5, 8])
const FINISHED = 3

// Where a video is in Bunny's encoding, and once finished, its 720p MP4 (or
// the largest smaller one, for originals below 720p) plus the thumbnail Bunny
// generated.
export async function videoStatus(videoId) {
  if (!GUID.test(videoId)) throw new StoreError('Invalid video id.', 400)
  const video = await (await streamRequest('GET', `/${videoId}`, 'look up the video')).json()
  if (FAILED.has(video.status)) return { state: 'failed' }
  if (video.status !== FINISHED) return { state: 'processing', progress: video.encodeProgress ?? 0 }

  const { streamCdn } = bunny()
  const listed = (String(video.availableResolutions ?? '').match(/\d+(?=p)/g) ?? [])
    .map(Number)
    .filter((height) => height <= 720)
    .sort((a, b) => b - a)
  for (const height of listed.length ? listed : [720, 480, 360, 240]) {
    const url = `${streamCdn}/${videoId}/play_${height}p.mp4`
    const head = await fetch(`${url}?check=${Date.now()}`, { method: 'HEAD' })
    if (head.ok) {
      return {
        state: 'ready',
        url,
        size: Number(head.headers.get('content-length')) || null,
        thumbnail: `${streamCdn}/${videoId}/${video.thumbnailFileName || 'thumbnail.jpg'}`,
      }
    }
  }
  // Encoded, but the MP4 isn't there (yet): MP4 Fallback may be off, or the
  // file is still being written.
  return { state: 'no-mp4' }
}

// ---- Validation and clean-up ----------------------------------------------

function parse(url) {
  try {
    return new URL(url)
  } catch {
    return null
  }
}

// True for URLs this CMS produced; nothing else may be saved into the content.
function isOwn(kind, value) {
  if (typeof value !== 'string' || value.includes('..')) return false
  if (storageKind() === 'local') {
    return (kind === 'video' || kind === 'image') && value.startsWith(`${LOCAL_URL}media/`)
  }
  const url = parse(value)
  if (!url) return false
  const { storageCdn, streamCdn } = bunny()
  if (kind === 'image') return url.origin === new URL(storageCdn).origin && url.pathname.startsWith('/media/')
  if (url.origin !== new URL(streamCdn).origin) return false
  const [, id, file] = url.pathname.split('/')
  if (!GUID.test(id ?? '')) return false
  return kind === 'video' ? /^play_\d+p\.mp4$/.test(file ?? '') : /^[\w.-]+\.(jpe?g|webp|png)$/.test(file ?? '')
}

// Rebuilds a content document from untrusted input, keeping only what the
// site understands: per slot an optional video (with its Bunny id, thumbnail
// and size), image (with its size), caption and name.
export function sanitizeContent(input) {
  const invalid = (message) => new StoreError(message, 400)
  const entries = Object.entries(input?.media ?? {})
  if (entries.length > 200) throw invalid('Too many media slots.')

  const media = {}
  for (const [slot, value] of entries) {
    if (!SLOT_ID.test(slot)) throw invalid(`Invalid slot "${slot}".`)
    const entry = {}
    for (const field of ['video', 'image']) {
      if (!value?.[field]) continue
      if (!isOwn(field, value[field])) throw invalid(`Slot "${slot}" points at a file outside the media store.`)
      entry[field] = value[field]
    }
    if (entry.video && GUID.test(value.videoId ?? '')) entry.videoId = value.videoId
    if (entry.video && value.thumbnail && isOwn('thumbnail', value.thumbnail)) entry.thumbnail = value.thumbnail
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

// What a content document keeps in storage: files (images, and videos in
// local mode) and Bunny Stream videos.
function holdings(content) {
  const files = new Set()
  const videos = new Set()
  for (const entry of Object.values(content.media ?? {})) {
    if (entry.image) files.add(entry.image)
    if (entry.videoId) videos.add(entry.videoId)
    else if (entry.video?.startsWith(LOCAL_URL)) files.add(entry.video)
  }
  return { files, videos }
}

// Deletes whatever `previous` used and `next` no longer does.
export async function removeUnused(previous, next) {
  const before = holdings(previous)
  const after = holdings(next)
  const files = [...before.files].filter((url) => !after.files.has(url))
  const videos = [...before.videos].filter((id) => !after.videos.has(id))

  if (storageKind() === 'local') {
    await Promise.all(
      files.map((url) => rm(path.join(LOCAL_DIR, url.slice(LOCAL_URL.length)), { force: true })),
    )
    return
  }
  const { storageCdn } = bunny()
  await Promise.all([
    ...files
      .filter((url) => url.startsWith(`${storageCdn}/`))
      .map((url) => storageRequest('DELETE', url.slice(storageCdn.length + 1))),
    ...videos.map((id) => streamRequest('DELETE', `/${id}`, 'delete the old video')),
  ])
}
