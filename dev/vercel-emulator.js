import { randomBytes } from 'node:crypto'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { Readable } from 'node:stream'
import { pathToFileURL } from 'node:url'
import { loadEnv } from 'vite'
import { LOCAL_DIR, LOCAL_URL } from '../api/_lib/store.js'

// Development only. Runs middleware.js and the api/ functions inside Vite's
// dev and preview servers so `npm run dev` behaves like the Vercel deployment,
// and stands in for the Blob store with files in .cms/ when no Blob token is
// set. None of this is deployed.

const TYPES = {
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.png': 'image/png',
  '.webp': 'image/webp',
  '.avif': 'image/avif',
  '.svg': 'image/svg+xml',
}

// Covers the matcher forms middleware.js uses: '/path' and '/path/:rest*'.
const matcherToRegExp = (pattern) =>
  new RegExp(`^${pattern.replace(/\/:\w+\*/g, '(?:/.*)?')}$`)

function toRequest(req, url) {
  const headers = new Headers()
  for (const [name, value] of Object.entries(req.headers)) {
    for (const item of [value].flat()) headers.append(name, item)
  }
  const hasBody = req.method !== 'GET' && req.method !== 'HEAD'
  return new Request(url, {
    method: req.method,
    headers,
    body: hasBody ? Readable.toWeb(req) : undefined,
    duplex: 'half',
  })
}

async function send(res, response) {
  res.statusCode = response.status
  response.headers.forEach((value, name) => {
    if (name !== 'set-cookie') res.setHeader(name, value)
  })
  const cookies = response.headers.getSetCookie()
  if (cookies.length) res.setHeader('Set-Cookie', cookies)
  res.end(Buffer.from(await response.arrayBuffer()))
}

async function callFunction(root, load, pathname, request) {
  const file = `api${pathname.slice('/api'.length)}.js`
  const isPrivate = file.split('/').some((part) => part.startsWith('_') || part.startsWith('.'))
  if (isPrivate || !existsSync(path.join(root, file))) {
    return Response.json({ error: 'Not found' }, { status: 404 })
  }
  const handler = (await load(file))[request.method]
  if (!handler) return Response.json({ error: 'Method not allowed' }, { status: 405 })
  return handler(request)
}

// Local stand-in for a Blob client upload: PUT /_cms/upload?path=media/…
async function saveLocalUpload(load, url, request) {
  const { isAuthenticated } = await load('api/_lib/auth.js')
  if (!(await isAuthenticated(request))) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const target = url.searchParams.get('path') ?? ''
  if (!/^media\/[a-z0-9/-]+\/[a-z0-9.-]+$/.test(target) || target.includes('..')) {
    return Response.json({ error: 'Invalid upload path.' }, { status: 400 })
  }
  const extension = path.extname(target)
  const name = `${target.slice(0, target.length - extension.length)}-${randomBytes(4).toString('hex')}${extension}`
  const file = path.join(LOCAL_DIR, name)
  await mkdir(path.dirname(file), { recursive: true })
  await writeFile(file, Buffer.from(await request.arrayBuffer()))
  return Response.json({ url: LOCAL_URL + name })
}

// Serves .cms/ files with Range support, which video playback needs.
function serveLocalFile(req, res, pathname) {
  const file = path.join(LOCAL_DIR, decodeURIComponent(pathname.slice(LOCAL_URL.length)))
  if (!file.startsWith(LOCAL_DIR + path.sep) || !existsSync(file) || !statSync(file).isFile()) {
    res.statusCode = 404
    return res.end('Not found')
  }
  const { size } = statSync(file)
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '')
  let start = 0
  let end = size - 1
  if (range?.[1]) {
    start = Number(range[1])
    if (range[2]) end = Math.min(Number(range[2]), end)
  } else if (range?.[2]) {
    start = Math.max(size - Number(range[2]), 0)
  }
  res.writeHead(range ? 206 : 200, {
    'Content-Type': TYPES[path.extname(file).toLowerCase()] ?? 'application/octet-stream',
    'Content-Length': end - start + 1,
    'Accept-Ranges': 'bytes',
    ...(range ? { 'Content-Range': `bytes ${start}-${end}/${size}` } : {}),
  })
  createReadStream(file, { start, end }).pipe(res)
}

export default function vercelEmulator() {
  let root

  const handler = (load) => async (req, res, next) => {
    try {
      const url = new URL(req.url, `http://${req.headers.host}`)
      const { pathname } = url
      const isApi = pathname.startsWith('/api/')
      const isLocalStore = pathname.startsWith(LOCAL_URL)
      const isAdmin = pathname === '/admin' || pathname.startsWith('/admin/')
      if (!isApi && !isLocalStore && !isAdmin) return next()

      if (isLocalStore && req.method === 'GET') return serveLocalFile(req, res, pathname)

      const request = toRequest(req, url)
      const { default: middleware, config } = await load('middleware.js')
      if (config.matcher.some((pattern) => matcherToRegExp(pattern).test(pathname))) {
        const response = await middleware(request)
        if (!response.headers.has('x-middleware-next')) return send(res, response)
      }

      if (isApi) return send(res, await callFunction(root, load, pathname, request))
      if (isLocalStore) return send(res, await saveLocalUpload(load, url, request))

      // Let Vite serve admin/index.html for /admin.
      if (pathname === '/admin') req.url = `/admin/${url.search}`
      next()
    } catch (error) {
      console.error(error)
      res.statusCode = 500
      res.end('Internal error (see the dev server log)')
    }
  }

  return {
    name: 'vercel-emulator',
    config(_, { mode }) {
      // Make .env.local (ADMIN_PASSWORD, BLOB_READ_WRITE_TOKEN…) visible to the functions.
      for (const [name, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) {
        process.env[name] ??= value
      }
    },
    configResolved(resolved) {
      root = resolved.root
    },
    configureServer(server) {
      server.middlewares.use(handler((file) => server.ssrLoadModule(`/${file}`)))
    },
    configurePreviewServer(server) {
      server.middlewares.use(handler((file) => import(pathToFileURL(path.join(root, file)).href)))
    },
  }
}
