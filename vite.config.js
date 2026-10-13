import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import vercelEmulator from './dev/vercel-emulator.js'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), vercelEmulator()],
  define: {
    // Shown in the admin footer so it's clear which deployment is running.
    'import.meta.env.VITE_BUILD': JSON.stringify(
      (process.env.VERCEL_GIT_COMMIT_SHA ?? 'local').slice(0, 7),
    ),
  },
  build: {
    // Keep the rarely-needed font subsets as files; inlined as base64 they
    // would be downloaded by every visitor inside the stylesheet.
    assetsInlineLimit: 0,
    rollupOptions: {
      // Two pages: the public site and the media manager at /admin.
      input: { main: 'index.html', admin: 'admin/index.html' },
    },
  },
})
