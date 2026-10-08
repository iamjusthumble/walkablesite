import { DatabaseSync } from 'node:sqlite'
import { mkdirSync } from 'node:fs'
import { dirname, resolve } from 'node:path'

export function createWaitlistHandler({ databasePath = process.env.WAITLIST_DB || resolve('data/waitlist.sqlite'), rateLimit = 8, windowMs = 15 * 60 * 1000, momentumThreshold = 0 } = {}) {
  if (databasePath !== ':memory:') mkdirSync(dirname(databasePath), { recursive: true, mode: 0o700 })
  const db = new DatabaseSync(databasePath)
  db.exec(`PRAGMA journal_mode=WAL; CREATE TABLE IF NOT EXISTS leads (
    id INTEGER PRIMARY KEY, email TEXT NOT NULL, track TEXT NOT NULL,
    first_name TEXT, city TEXT, business_name TEXT, category TEXT, foot_traffic INTEGER,
    consent INTEGER NOT NULL, consent_text TEXT NOT NULL, created_at TEXT NOT NULL,
    UNIQUE(email, track));`)
  const insert = db.prepare(`INSERT OR IGNORE INTO leads (email,track,first_name,city,business_name,category,foot_traffic,consent,consent_text,created_at) VALUES (?,?,?,?,?,?,?,?,?,?)`)
  const attempts = new Map()
  function respond(res, status, data) { res.writeHead(status, { 'Content-Type': 'application/json', 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff' }); res.end(JSON.stringify(data)) }
  const countLeads = db.prepare(`SELECT
    SUM(track = 'walker') AS walkers, SUM(track = 'business') AS businesses,
    COUNT(DISTINCT CASE WHEN city <> '' THEN lower(city) END) AS cities FROM leads`)
  // Public momentum counts stay hidden until they pass an owner-chosen threshold (PRD 9.5).
  const momentumMin = Number(process.env.MOMENTUM_MIN ?? momentumThreshold)
  const roundDown = n => n >= 1000 ? Math.floor(n / 100) * 100 : n >= 100 ? Math.floor(n / 10) * 10 : n
  async function handler(req, res, next) {
    const pathname = req.url?.split('?')[0]
    if (pathname === '/api/waitlist/stats') {
      if (req.method !== 'GET') { res.setHeader('Allow', 'GET'); return respond(res, 405, { message: 'Use GET.' }) }
      const { walkers = 0, businesses = 0, cities = 0 } = countLeads.get()
      const show = momentumMin > 0 && Number(walkers) + Number(businesses) >= momentumMin
      return respond(res, 200, show ? { show, walkers: roundDown(Number(walkers)), businesses: roundDown(Number(businesses)), cities: Number(cities) } : { show: false })
    }
    if (pathname !== '/api/waitlist') { if (next) return next(); return respond(res, 404, { message: 'Not found.' }) }
    if (req.method !== 'POST') { res.setHeader('Allow', 'POST'); return respond(res, 405, { message: 'Use POST to join the waitlist.' }) }
    const origin = req.headers.origin
    const expectedOrigin = process.env.PUBLIC_ORIGIN
    if (origin) {
      let valid = false
      try { valid = expectedOrigin ? new URL(origin).origin === new URL(expectedOrigin).origin : new URL(origin).host === req.headers.host } catch { /* malformed origin */ }
      if (!valid) return respond(res, 403, { message: 'Please submit the form from the Walkable website.' })
    }
    if (!req.headers['content-type']?.includes('application/json')) return respond(res, 415, { message: 'Expected a JSON request.' })
    const now = Date.now()
    for (const [key, entry] of attempts) if (entry.reset <= now) attempts.delete(key)
    // Forwarded headers are deliberately ignored unless the deployment provides a trusted proxy.
    const ip = req.socket.remoteAddress || 'unknown'
    const attempt = attempts.get(ip) || { count: 0, reset: now + windowMs }
    if (attempt.count >= rateLimit) { res.setHeader('Retry-After', String(Math.ceil((attempt.reset - now) / 1000))); return respond(res, 429, { message: 'A few too many tries. Please come back in a few minutes.' }) }
    attempt.count++; attempts.set(ip, attempt)
    try {
      let body = ''; let bytes = 0
      for await (const chunk of req) { bytes += chunk.length; if (bytes > 8192) return respond(res, 413, { message: 'This request is too large.' }); body += chunk }
      let data
      try { data = JSON.parse(body) } catch { return respond(res, 400, { message: 'Please check your form and try again.' }) }
      if (!data || typeof data !== 'object' || Array.isArray(data)) return respond(res, 400, { message: 'Please check your form and try again.' })
      if (data.website) return respond(res, 200, { success: true })
      const clean = (key, max = 120) => typeof data[key] === 'string' ? data[key].trim().slice(0, max) : ''
      const email = clean('email', 255).toLowerCase()
      const track = clean('track')
      if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return respond(res, 422, { message: 'Please enter a valid email address.' })
      if (!['walker', 'business'].includes(track)) return respond(res, 422, { message: 'Please choose walker or business.' })
      if (data.consent !== true) return respond(res, 422, { message: 'Please agree to receive your waitlist updates.' })
      if (track === 'business' && (!clean('businessName') || !clean('city') || !['Food & Drink', 'Retail', 'Fitness', 'Other'].includes(clean('category')))) return respond(res, 422, { message: 'Please enter your business name, category, and city.' })
      const rawTraffic = clean('footTraffic')
      if (track === 'business' && rawTraffic && (!/^\d+$/.test(rawTraffic) || Number(rawTraffic) > 100000000)) return respond(res, 422, { message: 'Please enter a valid monthly foot traffic estimate.' })
      const result = insert.run(email, track, track === 'walker' ? clean('firstName') : '', clean('city'), track === 'business' ? clean('businessName') : '', track === 'business' ? clean('category') : '', track === 'business' && rawTraffic ? Number(rawTraffic) : null, 1, 'I’d like to receive updates about Walkable.', new Date().toISOString())
      return respond(res, 200, { success: true, duplicate: result.changes === 0 })
    } catch (err) {
      console.error('Waitlist storage error:', err.code || err.name)
      if (!res.headersSent) respond(res, 500, { message: 'We couldn’t save your spot just now. Please try again shortly.' })
    }
  }
  handler.close = () => db.close()
  return handler
}
