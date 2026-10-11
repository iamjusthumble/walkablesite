// Waitlist storage in Upstash Redis over its REST API (no client library needed).
// Used on Vercel, where functions have no lasting disk. Accepts the variable names
// set by Vercel's Upstash integration (KV_REST_API_*) or by Upstash directly.
//
// Keys: walkable:lead:<track>:<email> (dedupe, JSON record), walkable:leads (list of
// all records, for export), walkable:count:<track>, walkable:cities (set), walkable:rl:<ip>.

export function redisConfig(env = process.env) {
  const url = env.KV_REST_API_URL || env.UPSTASH_REDIS_REST_URL
  const token = env.KV_REST_API_TOKEN || env.UPSTASH_REDIS_REST_TOKEN
  return url && token ? { url: url.replace(/\/$/, ''), token } : null
}

export function createRedisStore({ url, token }, { fetch: doFetch = fetch } = {}) {
  async function pipeline(commands) {
    const res = await doFetch(`${url}/pipeline`, { method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: JSON.stringify(commands) })
    if (!res.ok) throw Object.assign(new Error(`Redis HTTP ${res.status}`), { code: `REDIS_${res.status}` })
    const results = await res.json()
    const failed = results.find(r => r.error)
    if (failed) throw Object.assign(new Error(failed.error), { code: 'REDIS_ERROR' })
    return results.map(r => r.result)
  }
  return {
    async add(lead) {
      const record = JSON.stringify({ ...lead, consent: true })
      const [created] = await pipeline([['SET', `walkable:lead:${lead.track}:${lead.email}`, record, 'NX']])
      if (created !== 'OK') return { duplicate: true }
      await pipeline([['RPUSH', 'walkable:leads', record], ['INCR', `walkable:count:${lead.track}`], ...(lead.city ? [['SADD', 'walkable:cities', lead.city.toLowerCase()]] : [])])
      return { duplicate: false }
    },
    async stats() {
      const [walkers, businesses, cities] = await pipeline([['GET', 'walkable:count:walker'], ['GET', 'walkable:count:business'], ['SCARD', 'walkable:cities']])
      return { walkers: Number(walkers || 0), businesses: Number(businesses || 0), cities: Number(cities || 0) }
    },
    async all() {
      const [rows] = await pipeline([['LRANGE', 'walkable:leads', 0, -1]])
      return rows.map(r => JSON.parse(r))
    },
    // Shared across all function instances, unlike an in-memory limiter.
    limiter(limit = 8, windowSec = 15 * 60) {
      return async (ip) => {
        const key = `walkable:rl:${ip}`
        const [count, , ttl] = await pipeline([['INCR', key], ['EXPIRE', key, windowSec, 'NX'], ['TTL', key]])
        return count > limit ? { limited: true, retryAfter: Math.max(1, Number(ttl)) } : { limited: false }
      }
    },
  }
}
