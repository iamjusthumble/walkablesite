// Prints every waitlist signup as CSV. Reads Upstash Redis when its variables are set
// (the Vercel deployment), otherwise the local SQLite database (the Node server).
import { resolve } from 'node:path'
import { createRedisStore, redisConfig } from '../server/redis-store.js'
const columns = ['email', 'track', 'first_name', 'city', 'business_name', 'category', 'foot_traffic', 'consent', 'created_at']
const escape = value => {
  let text = String(value ?? '')
  if (/^[=+\-@\t\r\n]/.test(text)) text = `'${text}` // neutralise spreadsheet formulas
  return `"${text.replaceAll('"', '""')}"`
}
let rows
if (redisConfig()) {
  rows = (await createRedisStore(redisConfig()).all()).map(l => ({ email: l.email, track: l.track, first_name: l.firstName, city: l.city, business_name: l.businessName, category: l.category, foot_traffic: l.footTraffic, consent: l.consent ? 1 : 0, created_at: l.createdAt }))
} else {
  const { DatabaseSync } = await import('node:sqlite')
  const db = new DatabaseSync(process.env.WAITLIST_DB || resolve('data/waitlist.sqlite'), { readOnly: true })
  rows = db.prepare('SELECT * FROM leads ORDER BY id').all()
  db.close()
}
process.stdout.write([columns.join(','), ...rows.map(row => columns.map(k => escape(row[k])).join(','))].join('\n') + '\n')
