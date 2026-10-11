import react from '@vitejs/plugin-react'
import { defineConfig, loadEnv } from 'vite'
import { createWaitlistHandler } from './server/waitlist.js'

export default defineConfig(({ mode }) => {
  // Make server-only settings in .env (SMTP, notify address, DB path) visible to the waitlist API.
  for (const [key, value] of Object.entries(loadEnv(mode, process.cwd(), ''))) if (!key.startsWith('VITE_') && process.env[key] === undefined) process.env[key] = value
  return {
    plugins: [react(), {
      name: 'walkable-waitlist',
      configureServer(server) {
        const handler = createWaitlistHandler()
        server.middlewares.use(handler)
        server.httpServer?.on('close', () => handler.close())
      },
      configurePreviewServer(server) {
        const handler = createWaitlistHandler()
        server.middlewares.use(handler)
        server.httpServer?.on('close', () => handler.close())
      },
    }],
  }
})
