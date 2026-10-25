import { SLOT_ID } from '../../shared/mediaRules.js'
import { denyUnlessAdmin } from '../_lib/auth.js'
import { createVideoUpload, storageKind, StoreError, videoStatus } from '../_lib/store.js'

const json = (body, status = 200) =>
  Response.json(body, { status, headers: { 'Cache-Control': 'no-store' } })

function failure(error) {
  if (error.status) return json({ error: error.message }, error.status)
  console.error(error)
  return json({ error: `Something went wrong: ${error.message}` }, 500)
}

function requireBunny() {
  if (storageKind() !== 'bunny') throw new StoreError('Video uploads go to Bunny Stream, which is not set up here.', 400)
}

// Starts a video upload: creates the video in the Bunny Stream library and
// returns a signed permission for the browser to send the file there.
export async function POST(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    requireBunny()
    const { slot, filename } = (await request.json().catch(() => null)) ?? {}
    if (!SLOT_ID.test(slot ?? '')) throw new StoreError('Invalid slot.', 400)
    const title = `${slot} · ${String(filename ?? 'video').slice(0, 120)}`
    return json(await createVideoUpload(title))
  } catch (error) {
    return failure(error)
  }
}

// Encoding progress for an uploaded video, and its playable URL once ready.
export async function GET(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    requireBunny()
    const host = request.headers.get('x-forwarded-host') ?? request.headers.get('host')
    const id = new URL(request.url).searchParams.get('id') ?? ''
    return json(await videoStatus(id, host ? `https://${host}/` : undefined))
  } catch (error) {
    return failure(error)
  }
}
