import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Local dev: run `netlify dev` (serves functions + Identity on port 8888)
// alongside `vite` (port 5173). Functions are exposed at /api/... via each
// function's `config.path`, and Netlify Identity lives at /.netlify/identity —
// proxy both straight through without rewriting, so routing stays correct.
export default defineConfig({
  plugins: [react()],
  server: {
    // Hosted dev previews reach this server through their own hostname. Allow the
    // exact host(s) listed in VITE_ALLOWED_HOSTS (comma-separated), never a wildcard.
    allowedHosts: process.env.VITE_ALLOWED_HOSTS
      ? process.env.VITE_ALLOWED_HOSTS.split(',')
          .map((host) => host.trim())
          .filter(Boolean)
      : undefined,
    proxy: {
      '/api': { target: 'http://localhost:8888', changeOrigin: true },
      '/.netlify': { target: 'http://localhost:8888', changeOrigin: true }
    }
  }
})
