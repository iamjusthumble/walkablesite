import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import { resolve, extname, sep } from 'node:path'
import { brotliCompressSync, gzipSync, constants } from 'node:zlib'
import { createWaitlistHandler } from './waitlist.js'
const root = resolve('dist')
const handler = createWaitlistHandler()
const mime = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript', '.css': 'text/css', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.svg': 'image/svg+xml', '.webp': 'image/webp', '.ico': 'image/x-icon', '.woff2': 'font/woff2', '.txt': 'text/plain', '.xml': 'application/xml', '.json': 'application/json' }
const compressible = new Set(['.html', '.js', '.css', '.svg', '.txt', '.xml', '.json'])
// dist/ doesn't change while the server runs, so each compressed file is built once and reused.
const compressed = new Map()
function encode(file, content, acceptEncoding = '') {
  if (!compressible.has(extname(file)) || content.length < 1024) return null
  const encoding = /\bbr\b/.test(acceptEncoding) ? 'br' : /\bgzip\b/.test(acceptEncoding) ? 'gzip' : null
  if (!encoding) return null
  const key = `${encoding}:${file}`
  if (!compressed.has(key)) compressed.set(key, encoding === 'br' ? brotliCompressSync(content, { params: { [constants.BROTLI_PARAM_QUALITY]: 11 } }) : gzipSync(content, { level: 9 }))
  return { encoding, body: compressed.get(key) }
}
const server = createServer(async (req, res) => {
  if (req.url.startsWith('/api/')) return handler(req, res)
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); return res.end('Method not allowed') }
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://localhost').pathname)
    // Clean URLs (/faq, /for-business, /privacy, …) are pre-rendered as <path>/index.html.
    if (!extname(pathname)) pathname = `${pathname.replace(/\/$/, '')}/index.html`
    const file = resolve(root, `.${pathname}`)
    if (!file.startsWith(root + sep)) { res.writeHead(403); return res.end('Forbidden') }
    const content = await readFile(file)
    const packed = encode(file, content, req.headers['accept-encoding'])
    // Hashed build assets never change; images and pages revalidate so updates show up.
    const cache = pathname.startsWith('/assets/') ? 'public, max-age=31536000, immutable' : pathname.startsWith('/images/') ? 'public, max-age=86400, must-revalidate' : 'no-cache'
    res.writeHead(200, { 'Content-Type': mime[extname(file)] || 'application/octet-stream', 'X-Content-Type-Options': 'nosniff', 'Referrer-Policy': 'strict-origin-when-cross-origin', 'X-Frame-Options': 'DENY', 'Cache-Control': cache, Vary: 'Accept-Encoding', ...(packed && { 'Content-Encoding': packed.encoding }) })
    res.end(req.method === 'HEAD' ? undefined : packed ? packed.body : content)
  } catch { res.writeHead(404, { 'Content-Type': 'text/plain' }); res.end('Page not found') }
})
server.listen(process.env.PORT || 4173, '0.0.0.0', () => console.log(`Walkable ready at http://localhost:${process.env.PORT || 4173}`))
process.on('SIGTERM', () => server.close(() => { handler.close(); process.exit(0) }))
