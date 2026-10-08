import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { createWaitlistHandler } from './waitlist.js'
const root = resolve('dist')
const handler = createWaitlistHandler()
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml' }
const server = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return handler(req, res)
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Method not allowed') }
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    if (pathname === '/') pathname = '/index.html'
    else if (['/privacy', '/terms', '/press'].includes(pathname)) pathname += '/index.html'
    const file = resolve(root, `.${pathname}`)
    if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end('Forbidden') }
    const content = await readFile(file)
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : 'no-cache' })
    res.end(req.method === 'HEAD' ? undefined : content)
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Page not found') }
})
server.listen(process.env.PORT || 4173, '0.0.0.0', () => console.log(`Walkable ready at http://localhost:${process.env.PORT || 4173}`))
process.on('SIGTERM', () => server.close(() => { handler.close(); process.exit(0) }))
