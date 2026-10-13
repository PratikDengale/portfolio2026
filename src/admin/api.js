// Calls to the admin API. A 401 means the session ended: reloading shows the
// sign-in form.
async function request(path, init) {
  const response = await fetch(path, init)
  if (response.status === 401) {
    window.location.reload()
    return new Promise(() => {})
  }
  const data = await response.json().catch(() => ({}))
  if (!response.ok) throw new Error(data.error ?? `Request failed (${response.status}).`)
  return data
}

export const loadContent = () => request('/api/admin/content')

export const saveContent = (content, etag) =>
  request('/api/admin/content', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content, etag }),
  })

const safeName = (name) =>
  name
    .toLowerCase()
    .replace(/[^a-z0-9.]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'file'

// The Blob SDK reports any failure to get an upload token as the same generic
// message. Ask our endpoint again to find out what it actually said.
async function explainTokenFailure(pathname, multipart) {
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      type: 'blob.generate-client-token',
      payload: { pathname, clientPayload: null, multipart },
    }),
  })
  if (response.ok) return 'The upload could not be started. Try publishing again.'
  const text = await response.text()
  let detail = text.slice(0, 300)
  try {
    detail = JSON.parse(text).error ?? detail
  } catch {
    // Not JSON: keep the raw text.
  }
  return `The server refused the upload (HTTP ${response.status}): ${detail || 'no details given'}`
}

// Uploads one file for a slot and resolves to its public URL. `onProgress`
// receives a percentage where the storage reports one.
export async function uploadFile(storage, slot, file, onProgress) {
  const pathname = `media/${slot}/${safeName(file.name)}`

  if (storage === 'local') {
    const { url } = await request(`/_cms/upload?path=${encodeURIComponent(pathname)}`, {
      method: 'PUT',
      body: file,
    })
    return url
  }

  const { upload } = await import('@vercel/blob/client')
  const multipart = file.size > 20 * 1024 * 1024
  try {
    const blob = await upload(pathname, file, {
      access: 'public',
      handleUploadUrl: '/api/admin/upload',
      contentType: file.type || undefined,
      multipart,
      onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
    })
    return blob.url
  } catch (error) {
    if (/retrieve the client token/.test(error.message)) {
      throw new Error(await explainTokenFailure(pathname, multipart), { cause: error })
    }
    throw error
  }
}
