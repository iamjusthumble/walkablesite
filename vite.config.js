import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { createWaitlistHandler } from './server/waitlist.js'

export default defineConfig({
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
})
