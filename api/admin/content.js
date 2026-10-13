import { denyUnlessAdmin } from '../_lib/auth.js'
import {
  mediaUrls,
  readContent,
  removeMedia,
  sanitizeContent,
  storageKind,
  uploadMode,
  writeContent,
} from '../_lib/store.js'

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// Only signed-in admins reach this, so unexpected errors are reported in full:
// it is the quickest way to see what a storage problem actually is.
function failure(error) {
  if (error.status) return json({ error: error.message }, error.status)
  console.error(error)
  return json({ error: `Something went wrong: ${error.message}` }, 500)
}

// The latest saved content, plus where uploads should be sent.
export async function GET(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    const { content, etag } = await readContent({ fresh: true })
    return json({ content, etag, storage: storageKind(), upload: uploadMode() })
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
