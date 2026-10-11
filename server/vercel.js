// Setup shared by the Vercel functions in api/waitlist/. Created once per function instance.
import { createSignupService, createMemoryLimiter, createEmailOnlyStore, MAX_BODY_BYTES } from './signup.js'
import { createRedisStore, redisConfig } from './redis-store.js'
import { createSignupNotifier } from './notify.js'

let service
function getService() {
  if (service) return service
  const redis = redisConfig() ? createRedisStore(redisConfig()) : null
  service = createSignupService({
    store: redis || createEmailOnlyStore(),
    limiter: redis ? redis.limiter(8, 15 * 60) : createMemoryLimiter(8, 15 * 60 * 1000),
    notify: createSignupNotifier(),
    momentumMin: Number(process.env.MOMENTUM_MIN || 0),
    waitForEmails: true,
  })
  return service
}

const json = ({ status, body, headers = {} }) => Response.json(body, { status, headers: { 'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff', ...headers } })

export async function handleSignup(request) {
  try {
    return json(await getService().submit({
      origin: request.headers.get('origin'),
      host: request.headers.get('x-forwarded-host') || request.headers.get('host'),
      contentType: request.headers.get('content-type'),
      // Vercel sets these at its edge, so they can be trusted here.
      ip: request.headers.get('x-real-ip') || request.headers.get('x-forwarded-for')?.split(',')[0].trim() || 'unknown',
      readBody: async () => { const text = await request.text(); return Buffer.byteLength(text) > MAX_BODY_BYTES ? null : text },
    }))
  } catch (err) {
    console.error('Waitlist error:', err.code || err.name || err.message)
    return json({ status: 500, body: { message: 'We couldn’t save your spot just now. Please try again shortly.' } })
  }
}

export async function handleStats() {
  try { return json(await getService().stats()) }
  catch { return json({ status: 200, body: { show: false } }) }
}

export const methodNotAllowed = (allow) => json({ status: 405, body: { message: `Use ${allow}.` }, headers: { Allow: allow } })
