import { EXTENSIONS, LOGO_TYPES, MAX_IMAGE_BYTES, safeBaseName, SLOT_ID } from '../../shared/mediaRules.js'
import { denyUnlessAdmin } from '../_lib/auth.js'
import { saveImage, StoreError } from '../_lib/store.js'

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

// Uploads one image: the raw file is the request body, its type the
// Content-Type header. POST /api/admin/image?slot=<slot>&name=<file name>
export async function POST(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    const params = new URL(request.url).searchParams
    const slot = params.get('slot') ?? ''
    const type = (request.headers.get('content-type') ?? '').split(';')[0].trim()
    if (!SLOT_ID.test(slot)) throw new StoreError('Invalid slot.', 400)
    if (!LOGO_TYPES.includes(type)) throw new StoreError('Use JPG, PNG, WebP, AVIF or SVG.', 415)
    if (Number(request.headers.get('content-length')) > MAX_IMAGE_BYTES) {
      throw new StoreError('Images can be up to 4 MB.', 413)
    }
    const bytes = Buffer.from(await request.arrayBuffer())
    if (!bytes.length || bytes.length > MAX_IMAGE_BYTES) throw new StoreError('Images can be up to 4 MB.', 413)

    const url = await saveImage(slot, safeBaseName(params.get('name') ?? ''), EXTENSIONS[type], bytes)
    return json({ url })
  } catch (error) {
    if (error.status) return json({ error: error.message }, error.status)
    console.error(error)
    return json({ error: `Something went wrong: ${error.message}` }, 500)
  }
}
