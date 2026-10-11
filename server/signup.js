// Waitlist signup logic shared by the Node server (server/waitlist.js, SQLite)
// and the Vercel functions (api/waitlist/, Redis or email-only). Framework-free:
// takes request facts, returns { status, body, headers }.

export const CONSENT_TEXT = 'I’d like to receive updates about Walkable.'
export const MAX_BODY_BYTES = 8192
const CATEGORIES = ['Food & Drink', 'Retail', 'Fitness', 'Other']
const fail = (status, message, headers) => ({ status, body: { message }, headers })

// Turns a parsed form body into a clean lead, or an error response.
export function validateSignup(data) {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return { error: fail(400, 'Please check your form and try again.') }
  const clean = (key, max = 120) => typeof data[key] === 'string' ? data[key].trim().slice(0, max) : ''
  const email = clean('email', 255).toLowerCase()
  const track = clean('track')
  if (email.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: fail(422, 'Please enter a valid email address.') }
  if (!['walker', 'business'].includes(track)) return { error: fail(422, 'Please choose walker or business.') }
  if (data.consent !== true) return { error: fail(422, 'Please agree to receive your waitlist updates.') }
  if (track === 'business' && (!clean('businessName') || !clean('city') || !CATEGORIES.includes(clean('category')))) return { error: fail(422, 'Please enter your business name, category, and city.') }
  const rawTraffic = clean('footTraffic')
  if (track === 'business' && rawTraffic && (!/^\d+$/.test(rawTraffic) || Number(rawTraffic) > 100000000)) return { error: fail(422, 'Please enter a valid monthly foot traffic estimate.') }
  const business = track === 'business'
  return { lead: { email, track, firstName: business ? '' : clean('firstName'), city: clean('city'), businessName: business ? clean('businessName') : '', category: business ? clean('category') : '', footTraffic: business && rawTraffic ? Number(rawTraffic) : null, createdAt: new Date().toISOString() } }
}

// Per-process limiter for the Node server (and a fallback where no shared store exists).
export function createMemoryLimiter(limit = 8, windowMs = 15 * 60 * 1000) {
  const attempts = new Map()
  return async (key) => {
    const now = Date.now()
    for (const [k, entry] of attempts) if (entry.reset <= now) attempts.delete(k)
    const attempt = attempts.get(key) || { count: 0, reset: now + windowMs }
    if (attempt.count >= limit) return { limited: true, retryAfter: Math.ceil((attempt.reset - now) / 1000) }
    attempt.count++; attempts.set(key, attempt)
    return { limited: false }
  }
}

const roundDown = n => n >= 1000 ? Math.floor(n / 100) * 100 : n >= 100 ? Math.floor(n / 10) * 10 : n

// store: { add(lead) -> { duplicate }, stats() -> { walkers, businesses, cities } }
// limiter: async (key) -> { limited, retryAfter }
// waitForEmails: serverless functions can stop once they respond, so they send first.
export function createSignupService({ store, notify, limiter = createMemoryLimiter(), publicOrigin = process.env.PUBLIC_ORIGIN, momentumMin = 0, waitForEmails = false }) {
  async function submit({ origin, host, contentType, ip = 'unknown', readBody }) {
    if (origin) {
      let valid = false
      try { valid = publicOrigin ? new URL(origin).origin === new URL(publicOrigin).origin : new URL(origin).host === host } catch { /* malformed origin */ }
      if (!valid) return fail(403, 'Please submit the form from the Walkable website.')
    }
    if (!contentType?.includes('application/json')) return fail(415, 'Expected a JSON request.')
    const rate = await limiter(ip)
    if (rate.limited) return fail(429, 'A few too many tries. Please come back in a few minutes.', { 'Retry-After': String(rate.retryAfter) })
    const raw = await readBody()
    if (raw === null) return fail(413, 'This request is too large.')
    let data
    try { data = JSON.parse(raw) } catch { return fail(400, 'Please check your form and try again.') }
    if (data && typeof data === 'object' && data.website) return { status: 200, body: { success: true } } // honeypot: pretend it worked
    const { lead, error } = validateSignup(data)
    if (error) return error
    let duplicate
    try { ({ duplicate } = await store.add(lead)) }
    catch (err) { console.error('Waitlist storage error:', err.code || err.name || err.message); return fail(500, 'We couldn’t save your spot just now. Please try again shortly.') }
    if (!duplicate) {
      const sending = notify(lead).catch(() => {})
      if (waitForEmails) await sending
    }
    return { status: 200, body: { success: true, duplicate, confirmationEmail: !duplicate && !!notify.enabled && notify.confirmations !== false } }
  }
  // Public momentum counts stay hidden until they pass an owner-chosen threshold (PRD 9.5).
  async function stats() {
    if (!(momentumMin > 0) || !store.stats) return { status: 200, body: { show: false } }
    const { walkers = 0, businesses = 0, cities = 0 } = await store.stats()
    if (walkers + businesses < momentumMin) return { status: 200, body: { show: false } }
    return { status: 200, body: { show: true, walkers: roundDown(walkers), businesses: roundDown(businesses), cities } }
  }
  return { submit, stats }
}

// Used where no database is configured: emails still go out, nothing is stored.
export function createEmailOnlyStore() {
  console.warn('Waitlist storage is not configured: signups are emailed but not stored, and repeat signups can’t be detected.')
  return { add: async () => ({ duplicate: false }), stats: null }
}
