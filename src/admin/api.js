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

// Asks our upload endpoint for permission to send one file to the Blob store.
// Done here rather than inside the Blob SDK, which hides the server's reason
// for a refusal behind a generic message.
async function requestUploadPermission(type, pathname, multipart) {
  const response = await fetch('/api/admin/upload', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type, payload: { pathname, clientPayload: null, multipart } }),
  })
  const text = await response.text()
  let data = null
  try {
    data = JSON.parse(text)
  } catch {
    // Not JSON (e.g. a platform error page): reported below.
  }
  if (response.status === 401) {
    window.location.reload()
    return new Promise(() => {})
  }
  if (!response.ok || !data) {
    const detail = data?.error ?? text.replace(/<[^>]+>/g, ' ').trim().slice(0, 300)
    throw new Error(`The server refused the upload (HTTP ${response.status}): ${detail || 'no details given'}`)
  }
  return data
}

// Uploads one file for a slot and resolves to its public URL. `mode` is how
// this deployment accepts uploads (see uploadMode in api/_lib/store.js);
// `onProgress` receives a percentage where the storage reports one.
export async function uploadFile(mode, slot, file, onProgress) {
  const pathname = `media/${slot}/${safeName(file.name)}`

  if (mode === 'local') {
    const { url } = await request(`/_cms/upload?path=${encodeURIComponent(pathname)}`, {
      method: 'PUT',
      body: file,
    })
    return url
  }

  const multipart = file.size > 20 * 1024 * 1024
  const options = {
    access: 'public',
    contentType: file.type || undefined,
    multipart,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  }
  const blobClient = await import('@vercel/blob/client')

  if (mode === 'presigned') {
    // Checked first so a refusal is reported with its reason.
    await requestUploadPermission('blob.generate-presigned-url', pathname, multipart)
    const blob = await blobClient.uploadPresigned(pathname, file, {
      ...options,
      handleUploadUrl: '/api/admin/upload',
    })
    return blob.url
  }

  const { clientToken } = await requestUploadPermission('blob.generate-client-token', pathname, multipart)
  const blob = await blobClient.put(pathname, file, { ...options, token: clientToken })
  return blob.url
}
