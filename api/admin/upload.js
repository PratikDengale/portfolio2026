import { handleUpload } from '@vercel/blob/client'
import { LOGO_TYPES, MAX_UPLOAD_BYTES, VIDEO_TYPES } from '../../shared/mediaRules.js'
import { denyUnlessAdmin } from '../_lib/auth.js'

// Files go straight from the browser to the Blob store (functions can't accept
// large request bodies). This route only hands a signed-in admin a short-lived
// upload token restricted to media files under media/.
export async function POST(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    const result = await handleUpload({
      request,
      body: await request.json(),
      onBeforeGenerateToken: async (pathname) => {
        if (!pathname.startsWith('media/')) throw new Error('Invalid upload path.')
        return {
          allowedContentTypes: [...VIDEO_TYPES, ...LOGO_TYPES],
          maximumSizeInBytes: MAX_UPLOAD_BYTES,
          addRandomSuffix: true,
        }
      },
    })
    return Response.json(result)
  } catch (error) {
    console.error('Upload token request failed', error)
    return Response.json({ error: error.message }, { status: 400 })
  }
}
