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
  const blob = await upload(pathname, file, {
    access: 'public',
    handleUploadUrl: '/api/admin/upload',
    contentType: file.type || undefined,
    multipart: file.size > 20 * 1024 * 1024,
    onUploadProgress: ({ percentage }) => onProgress(Math.round(percentage)),
  })
  return blob.url
}
