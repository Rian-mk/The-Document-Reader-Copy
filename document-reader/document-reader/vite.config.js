import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import mkcert from 'vite-plugin-mkcert'
import path from 'path'

// Dev-only API proxy: forwards same-origin API calls (/auth, /history, ...)
// from the dev server to the backend. The app keeps using its configured
// absolute API base URL (see .env.*); the proxy only matters when that base
// URL is "/" (same-origin) — e.g. sandbox previews where "localhost" is not
// the machine running the backend.
const API_PROXY_PATHS = [
  '/auth', '/user', '/ocr', '/tts', '/pipeline',
  '/history', '/reports', '/admin', '/health', '/hangfire', '/swagger',
];
const apiProxy = Object.fromEntries(
  API_PROXY_PATHS.map((path) => [
    path,
    {
      target: process.env.VITE_DEV_PROXY_TARGET || 'http://localhost:7282',
      changeOrigin: true,
      secure: false,
    },
  ]),
);

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    // Set VITE_DEV_HTTPS=0 to skip local HTTPS certificates (e.g. inside
    // sandboxes/CI where a TLS-terminating proxy fronts the dev server)
    ...(process.env.VITE_DEV_HTTPS === '0' ? [] : [mkcert()]),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  server: {
    host: '0.0.0.0',
    // Besides localhost the dev server may be reached through a preview
    // host (e.g. *.e2b.app)
    allowedHosts: ['localhost', '127.0.0.1', '.e2b.app'],
    proxy: apiProxy,
  },
})
