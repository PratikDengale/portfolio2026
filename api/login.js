import { checkPassword, createSessionCookie } from './_lib/auth.js'

const redirect = (location, headers = {}) =>
  new Response(null, { status: 303, headers: { Location: location, ...headers } })

// Handles the sign-in form posted from /admin.
export async function POST(request) {
  const form = await request.formData().catch(() => null)
  const password = String(form?.get('password') ?? '')

  if (!(await checkPassword(password))) {
    // Slow down password guessing a little.
    await new Promise((resolve) => setTimeout(resolve, 600))
    return redirect('/admin?error=1')
  }
  return redirect('/admin', { 'Set-Cookie': await createSessionCookie(request) })
}
