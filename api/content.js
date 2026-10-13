import { readContent } from './_lib/store.js'

// Public: which uploaded file fills which media slot. Read by the site on load.
export async function GET() {
  try {
    const { content } = await readContent()
    return Response.json(content, {
      headers: {
        // Browsers always revalidate; Vercel's CDN answers from cache for a
        // minute and refreshes in the background after that.
        'Cache-Control': 'public, max-age=0, must-revalidate',
        'Vercel-CDN-Cache-Control': 'max-age=60, stale-while-revalidate=300',
      },
    })
  } catch (error) {
    // The page falls back to placeholders; don't let the CDN hold on to that.
    console.error(error)
    return Response.json({ media: {} }, { headers: { 'Cache-Control': 'no-store' } })
  }
}
