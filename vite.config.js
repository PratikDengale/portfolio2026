import { existsSync, readdirSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// Exposes the list of files in public/media as `virtual:media-manifest`, so
// content.js can fall back to placeholders for media that hasn't been added
// yet instead of requesting files that 404.
function mediaManifest() {
  const id = 'virtual:media-manifest'
  const resolvedId = '\0' + id
  const dir = fileURLToPath(new URL('./public/media', import.meta.url))

  return {
    name: 'media-manifest',
    resolveId: (source) => (source === id ? resolvedId : null),
    load(loaded) {
      if (loaded !== resolvedId) return null
      const files = existsSync(dir) ? readdirSync(dir, { recursive: true }) : []
      const paths = files
        .map((file) => file.split('\\').join('/'))
        .filter((file) => !file.split('/').some((part) => part.startsWith('.')))
        .map((file) => `/media/${file}`)
      return `export default ${JSON.stringify(paths)}`
    },
    configureServer(server) {
      const refresh = (file) => {
        if (!file.startsWith(dir)) return
        const mod = server.moduleGraph.getModuleById(resolvedId)
        if (mod) server.moduleGraph.invalidateModule(mod)
        server.ws.send({ type: 'full-reload' })
      }
      server.watcher.on('add', refresh).on('unlink', refresh)
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), mediaManifest()],
  build: {
    // Keep the rarely-needed font subsets as files; inlined as base64 they
    // would be downloaded by every visitor inside the stylesheet.
    assetsInlineLimit: 0,
  },
})
