import { safeBaseName } from '../../shared/mediaRules'

// Calls to the admin API. A 401 means the session ended: reloading shows the
// sign-in form.
async function request(path, init) {
  const response = await fetch(path, init)
  if (response.status === 401) {
    window.location.reload()
    return new Promise(() => {})
  }
  const text = await response.text()
  let data = {}
  try {
    data = JSON.parse(text)
  } catch {
    // Not JSON (e.g. a platform error page): reported below.
  }
  if (!response.ok) {
    const detail = data.error ?? text.replace(/<[^>]+>/g, ' ').trim().slice(0, 300)
    throw new Error(detail || `Request failed (HTTP ${response.status}).`)
  }
  return data
}

const postJson = (path, body) =>
  request(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })

export const loadContent = () => request('/api/admin/content')

export const saveContent = (content, etag) =>
  request('/api/admin/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, etag }),
  })

export async function uploadImage(slot, file) {
  const params = new URLSearchParams({ slot, name: file.name })
  const { url } = await request(`/api/admin/image?${params}`, {
    method: 'POST',
    headers: { 'Content-Type': file.type },
    body: file,
  })
  return { image: url, imageSize: file.size }
}

// Local mode only: the dev server stores the file in .cms/.
export async function uploadLocalVideo(slot, file) {
  const extension = file.name.match(/\.[a-z0-9]+$/i)?.[0].toLowerCase() ?? ''
  const target = `media/${slot}/${safeBaseName(file.name)}${extension}`
  const { url } = await request(`/_cms/upload?path=${encodeURIComponent(target)}`, {
    method: 'PUT',
    body: file,
  })
  return { video: url, videoSize: file.size }
}

// Sends a video straight from the browser to Bunny Stream with a resumable
// (tus) upload, using a permission signed by our server. Resolves to the
// Bunny video id; Bunny then needs time to encode it (see waitForVideo).
export async function uploadBunnyVideo(slot, file, onProgress) {
  const permission = await postJson('/api/admin/video', { slot, filename: file.name })
  const { Upload } = await import('tus-js-client')
  await new Promise((resolve, reject) => {
    new Upload(file, {
      endpoint: permission.endpoint,
      retryDelays: [0, 3000, 5000, 10000, 20000, 60000],
      // Each upload gets its own Bunny video, so there is nothing to resume
      // into after a reload.
      storeFingerprintForResuming: false,
      headers: {
        AuthorizationSignature: permission.signature,
        AuthorizationExpire: String(permission.expires),
        VideoId: permission.videoId,
        LibraryId: String(permission.libraryId),
      },
      metadata: { filetype: file.type, title: `${slot} · ${file.name}` },
      onProgress: (sent, total) => onProgress(Math.round((sent / total) * 100)),
      onError: (error) => reject(new Error(`Upload to Bunny failed: ${error.message}`)),
      onSuccess: resolve,
    }).start()
  })
  return permission.videoId
}

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

// Polls Bunny until the video is encoded and its MP4 exists. Resolves to the
// fields saved in the content document for that video.
export async function waitForVideo(videoId, onProgress) {
  const started = Date.now()
  let missingMp4 = 0
  for (;;) {
    const status = await request(`/api/admin/video?id=${encodeURIComponent(videoId)}`)
    if (status.state === 'ready') {
      return { video: status.url, videoId, thumbnail: status.thumbnail, videoSize: status.size ?? undefined }
    }
    if (status.state === 'failed') {
      throw new Error('Bunny could not encode this video. Export it again as an H.264 MP4 and re-upload it.')
    }
    if (status.state === 'blocked') {
      throw new Error(
        `Bunny encoded the video but refused to serve its MP4 (${status.detail}). In the Stream library’s security settings, make sure this site’s domain is an allowed domain and direct URL access isn’t blocked, then press Publish again.`,
      )
    }
    if (status.state === 'no-mp4' && ++missingMp4 > 3) {
      throw new Error(
        `Bunny encoded the video but made no MP4 file (${status.detail}). Turn on MP4 Fallback in the Stream library’s encoding settings, then choose the video again.`,
      )
    }
    if (Date.now() - started > 60 * 60 * 1000) {
      throw new Error('Bunny has been encoding for over an hour. Press Publish again later to carry on waiting.')
    }
    onProgress(status.progress ?? 0)
    await wait(4000)
  }
}
