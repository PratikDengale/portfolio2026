import { denyUnlessAdmin } from '../_lib/auth.js'
import {
  mediaUrls,
  readContent,
  removeMedia,
  sanitizeContent,
  storageKind,
  writeContent,
} from '../_lib/store.js'

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

function failure(error) {
  if (!error.status) console.error(error)
  return json({ error: error.status ? error.message : 'Something went wrong.' }, error.status ?? 500)
}

// The latest saved content, plus where uploads should be sent.
export async function GET(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    const { content, etag } = await readContent({ fresh: true })
    return json({ content, etag, storage: storageKind() })
  } catch (error) {
    return failure(error)
  }
}

// Publishes a new content document and deletes files it no longer uses.
export async function PUT(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    const body = await request.json().catch(() => null)
    const content = sanitizeContent(body?.content)
    const previous = await readContent({ fresh: true })
    const etag = await writeContent(content, body?.etag ?? null)

    const kept = new Set(mediaUrls(content))
    const orphans = mediaUrls(previous.content).filter((url) => !kept.has(url))
    await removeMedia(orphans).catch((error) => console.error('Could not delete old media', error))

    return json({ content, etag })
  } catch (error) {
    return failure(error)
  }
}
