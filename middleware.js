import { next } from '@vercel/functions/middleware'
import { isAuthenticated, isConfigured, isCrossOrigin } from './api/_lib/auth.js'

// Vercel Routing Middleware: everything under /admin and /api/admin needs a
// valid session. Pages get the sign-in form, API calls get a 401.
export const config = {
  matcher: ['/admin', '/admin/:path*', '/api/admin/:path*'],
}

export default async function middleware(request) {
  const url = new URL(request.url)
  const isApi = url.pathname.startsWith('/api/')

  if (await isAuthenticated(request)) {
    if (isCrossOrigin(request)) return Response.json({ error: 'Cross-origin request' }, { status: 403 })
    return next()
  }

  if (isApi) return Response.json({ error: 'Not signed in' }, { status: 401 })

  const message = !isConfigured()
    ? 'Admin is switched off: set the ADMIN_PASSWORD environment variable and redeploy.'
    : url.searchParams.has('error')
      ? 'Wrong password. Try again.'
      : ''
  return new Response(signInPage(message, isConfigured()), {
    status: isConfigured() ? 401 : 503,
    headers: { 'Content-Type': 'text/html; charset=utf-8', 'Cache-Control': 'no-store' },
  })
}

function signInPage(message, enabled) {
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex, nofollow">
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<title>Sign in — Pratik Dengale</title>
<style>
  * { box-sizing: border-box; }
  body { margin: 0; min-height: 100dvh; display: grid; place-items: center; padding: 24px;
    background: #0b0b0a; color: #ecebe7; font: 400 15px/1.4 system-ui, sans-serif; }
  form { width: 100%; max-width: 320px; display: grid; gap: 14px; }
  h1 { margin: 0 0 6px; font: 500 11px/1 ui-monospace, monospace; letter-spacing: .08em;
    text-transform: uppercase; color: #8a8984; }
  input, button { height: 44px; padding: 0 14px; border: 1px solid rgba(236,235,231,.24);
    border-radius: 0; background: none; color: inherit; font: inherit; }
  button { background: #ecebe7; border-color: #ecebe7; color: #0b0b0a; cursor: pointer; }
  :focus-visible { outline: 1px solid #ecebe7; outline-offset: 3px; }
  p { margin: 0; color: #e5837c; }
</style>
</head>
<body>
<form method="post" action="/api/login">
  <h1>Admin sign in</h1>
  ${message ? `<p role="alert">${message}</p>` : ''}
  ${
    enabled
      ? `<input type="password" name="password" aria-label="Password" placeholder="Password" autocomplete="current-password" required autofocus>
  <button type="submit">Sign in</button>`
      : ''
  }
</form>
</body>
</html>`
}
