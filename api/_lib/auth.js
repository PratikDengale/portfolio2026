// Password sessions for /admin. Web Crypto only, so the same code runs in the
// edge middleware and in the Node functions.

const COOKIE = 'admin_session'
const MAX_AGE = 60 * 60 * 24 * 7 // seconds

const encoder = new TextEncoder()

// The signing key is derived from the password, so changing ADMIN_PASSWORD
// also signs every existing session out.
async function sign(message) {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(`admin:${process.env.ADMIN_PASSWORD}`),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  const mac = await crypto.subtle.sign('HMAC', key, encoder.encode(message))
  return Array.from(new Uint8Array(mac), (byte) => byte.toString(16).padStart(2, '0')).join('')
}

function safeEqual(a, b) {
  if (a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

// Behind Vercel's proxy the URL a function sees is not reliably the public
// one, so the forwarded headers are checked as well.
function isHttps(request) {
  const forwarded = request.headers.get('x-forwarded-proto')
  return (forwarded ?? new URL(request.url).protocol).startsWith('https')
}

function ownHosts(request) {
  const { headers } = request
  return [new URL(request.url).host, headers.get('x-forwarded-host'), headers.get('host')].filter(Boolean)
}

function cookie(request, value, maxAge) {
  const secure = isHttps(request) ? '; Secure' : ''
  return `${COOKIE}=${value}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${maxAge}${secure}`
}

export const isConfigured = () => Boolean(process.env.ADMIN_PASSWORD)

export async function checkPassword(input) {
  if (!isConfigured()) return false
  // Comparing MACs keeps the comparison constant-time whatever the input length.
  return safeEqual(await sign(`password:${input}`), await sign(`password:${process.env.ADMIN_PASSWORD}`))
}

export async function createSessionCookie(request) {
  const expires = Date.now() + MAX_AGE * 1000
  return cookie(request, `${expires}.${await sign(`session:${expires}`)}`, MAX_AGE)
}

export const clearSessionCookie = (request) => cookie(request, '', 0)

export async function isAuthenticated(request) {
  if (!isConfigured()) return false
  const cookies = request.headers.get('cookie') ?? ''
  const value = cookies
    .split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith(`${COOKIE}=`))
    ?.slice(COOKIE.length + 1)
  if (!value) return false
  const [expires, signature = ''] = value.split('.')
  if (!(Number(expires) > Date.now())) return false
  return safeEqual(signature, await sign(`session:${expires}`))
}

// A request that changes something must come from our own pages.
export function isCrossOrigin(request) {
  if (request.method === 'GET' || request.method === 'HEAD') return false
  const origin = request.headers.get('origin')
  if (!origin || origin === 'null') return Boolean(origin)
  return !ownHosts(request).includes(new URL(origin).host)
}

// Second check inside each admin function, in case the middleware is ever
// bypassed or its matcher changes. Returns a response to send, or null.
export async function denyUnlessAdmin(request) {
  if (isCrossOrigin(request)) return Response.json({ error: 'Cross-origin request' }, { status: 403 })
  if (await isAuthenticated(request)) return null
  return Response.json({ error: 'Not signed in' }, { status: 401 })
}
