import { clearSessionCookie } from './_lib/auth.js'

export function POST(request) {
  return new Response(null, {
    status: 303,
    headers: { Location: '/admin', 'Set-Cookie': clearSessionCookie(request) },
  })
}
