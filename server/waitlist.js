import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { createSignupNotifier } from './notify.js'
import { createSignupService, createMemoryLimiter, CONSENT_TEXT, MAX_BODY_BYTES } from './signup.js'

// SQLite storage for the self-hosted Node server and local development.
export function createSqliteStore(databasePath) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(databasePath)
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL, track TEXT NOT NULL,
    first_name TEXT, city TEXT, business_name TEXT, category TEXT, foot_traffic INTEGER,
    consent INTEGER NOT NULL, consent_text TEXT NOT NULL, created_at TEXT NOT NULL,
    UNIQUE(email, track));`)
  const insert = db.prepare(`INSERT OR IGNORE INTO leads (email,track,first_name,city,business_name,category,foot_traffic,consent,consent_text,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
  const countLeads = db.prepare(`SELECT
    SUM(track = 'walker') AS walkers, SUM(track = 'business') AS businesses,
    COUNT(DISTINCT CASE WHEN city <> '' THEN lower(city) END) AS cities FROM leads`)
  return {
    add: async (lead) => ({ duplicate: insert.run(lead.email, lead.track, lead.firstName, lead.city, lead.businessName, lead.category, lead.footTraffic, 1, CONSENT_TEXT, lead.createdAt).changes === 0 }),
    stats: async () => { const r = countLeads.get(); return { walkers: Number(r.walkers || 0), businesses: Number(r.businesses || 0), cities: Number(r.cities || 0) } },
    close: () => db.close(),
  }
}

// Connect-style middleware for the Node server and the Vite dev/preview servers.
export function createWaitlistHandler({ databasePath = process.env.WAITLIST_DB || resolve('data/waitlist.sqlite'), rateLimit = 8, windowMs = 15 * 60 * 1000, momentumThreshold = 0, notify = createSignupNotifier() } = {}) {
  const store = createSqliteStore(databasePath)
  const service = createSignupService({ store, notify, limiter: createMemoryLimiter(rateLimit, windowMs), momentumMin: Number(process.env.MOMENTUM_MIN ?? momentumThreshold) })
  function respond(res, { status, body, headers = {} }) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers }); res.end(JSON.stringify(body)) }
  async function handler(req, res, next) {
    const pathname = req.url?.split('?')[0]
    if (pathname === '/api/waitlist/stats') {
      if (req.method !== 'GET') return respond(res, { status: 405, body: { message: 'Use GET.' }, headers: { Allow: 'GET' } })
      return respond(res, await service.stats())
    }
    if (pathname !== '/api/waitlist') { if (next) return next(); return respond(res, { status: 404, body: { message: 'Not found.' } }) }
    if (req.method !== 'POST') return respond(res, { status: 405, body: { message: 'Use POST to join the waitlist.' }, headers: { Allow: 'POST' } })
    try {
      respond(res, await service.submit({
        origin: req.headers.origin, host: req.headers.host, contentType: req.headers['content-type'],
        // Forwarded headers are deliberately ignored unless the deployment provides a trusted proxy.
        ip: req.socket.remoteAddress || 'unknown',
        readBody: async () => { let body = '', bytes = 0; for await (const chunk of req) { bytes += chunk.length; if (bytes > MAX_BODY_BYTES) return null; body += chunk } return body },
      }))
    } catch (err) {
      console.error('Waitlist error:', err.code || err.name)
      if (!res.headersSent) respond(res, { status: 500, body: { message: 'We couldn’t save your spot just now. Please try again shortly.' } })
    }
  }
  handler.close = () => store.close()
  return handler
}
