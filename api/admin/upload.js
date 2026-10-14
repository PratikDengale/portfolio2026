import { issueSignedToken } from '@vercel/blob'
import { handleUpload, handleUploadPresigned } from '@vercel/blob/client'
import {
  isVideoPath,
  LOGO_TYPES,
  MAX_IMAGE_BYTES,
  MAX_VIDEO_BYTES,
  VIDEO_TYPES,
} from '../../shared/mediaRules.js'
import { denyUnlessAdmin } from '../_lib/auth.js'

// What one upload may be, decided by the file's extension: videos and images
// have separate type and size limits.
function rulesFor(pathname) {
  if (typeof pathname !== 'string' || !pathname.startsWith('media/')) {
    throw new Error('Invalid upload path.')
  }
  return isVideoPath(pathname)
    ? { allowedContentTypes: VIDEO_TYPES, maximumSizeInBytes: MAX_VIDEO_BYTES }
    : { allowedContentTypes: LOGO_TYPES, maximumSizeInBytes: MAX_IMAGE_BYTES }
}

// Files go straight from the browser to the Blob store (functions can't accept
// large request bodies). This route only hands a signed-in admin a short-lived
// permission to upload one media file under media/. Which kind depends on how
// the store is connected (see uploadMode in _lib/store.js):
//   - with a read-write token: a client token
//   - without one (OIDC): a presigned upload URL
export async function POST(request) {
  const denied = await denyUnlessAdmin(request)
  if (denied) return denied
  try {
    const body = await request.json()

    if (body?.type === 'blob.generate-presigned-url') {
      const result = await handleUploadPresigned({
        request,
        body,
        // Only used to verify upload-completed callbacks, which we don't use.
        webhookPublicKey: process.env.BLOB_WEBHOOK_PUBLIC_KEY ?? 'unused',
        getSignedToken: async (pathname) => {
          const rules = rulesFor(pathname)
          return {
            token: await issueSignedToken({ pathname, operations: ['put'], ...rules }),
            urlOptions: { ...rules, addRandomSuffix: true },
          }
        },
      })
      return Response.json(result)
    }

    if (body?.type !== 'blob.generate-client-token') throw new Error('Unsupported upload request.')
    const result = await handleUpload({
      request,
      body,
      onBeforeGenerateToken: async (pathname) => ({ ...rulesFor(pathname), addRandomSuffix: true }),
    })
    return Response.json(result)
  } catch (error) {
    console.error('Upload permission request failed', error)
    return Response.json({ error: error.message }, { status: 400 })
  }
}
