import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWaitlistHandler } from './waitlist.js'
const valid = { email: 'walker@example.com', track: 'walker', consent: true, city: 'Accra' }
async function request(handler, payload, { method = 'POST', headers = {}, raw, ip = '127.0.0.1', url = '/api/waitlist' } = {}) {
  const req = Readable.from([Buffer.from(raw ?? JSON.stringify(payload))])
  Object.assign(req, { url, method, headers: { 'content-type': 'application/json', host: 'localhost:5188', ...headers }, socket: { remoteAddress: ip } })
  let status; let data; const responseHeaders = {}
  const res = { headersSent: false, setHeader: (k,v) => responseHeaders[k] = v, writeHead(code, h) { status = code; Object.assign(responseHeaders,h); this.headersSent = true }, end(body) { data = JSON.parse(body) } }
  await handler(req, res)
  return { status, data, headers: responseHeaders }
}
test('waitlist persists signups and handles normalized duplicate emails per audience', async () => {
  const dir = mkdtempSync(join(tmpdir(), 'walkable-test-')); const databasePath = join(dir, 'leads.sqlite')
  let handler = createWaitlistHandler({ databasePath })
  try {
    assert.deepEqual((await request(handler, valid)).data, { success: true, duplicate: false })
    handler.close(); handler = createWaitlistHandler({ databasePath })
    assert.deepEqual((await request(handler, { ...valid, email: ' WALKER@EXAMPLE.COM ' })).data, { success: true, duplicate: true })
    assert.deepEqual((await request(handler, { ...valid, track: 'business', businessName: 'Corner Cafe', category: 'Food & Drink', footTraffic: '120' })).data, { success: true, duplicate: false })
  } finally { handler.close(); rmSync(dir, { recursive: true, force: true }) }
})
test('invalid fields, missing consent, and invalid business details are rejected', async () => {
  const handler = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 50 })
  try {
    for (const data of [{ ...valid, email: 'bad' }, { ...valid, consent: false }, { ...valid, track: 'nope' }, { ...valid, track: 'business' }, { ...valid, track: 'business', businessName: 'Cafe', category: 'Food & Drink', footTraffic: '-3' }]) assert.equal((await request(handler, data)).status, 422)
    assert.equal((await request(handler, null)).status, 400)
    assert.equal((await request(handler, valid, { raw: '{' })).status, 400)
  } finally { handler.close() }
})
test('honeypot never stores a lead; methods, origins, body limits, and rate limits are enforced', async () => {
  const handler = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 3 })
  try {
    assert.equal((await request(handler, { ...valid, website: 'spam' })).status, 200)
    assert.equal((await request(handler, valid)).data.duplicate, false)
    assert.equal((await request(handler, valid, { method: 'GET' })).status, 405)
    assert.equal((await request(handler, valid, { headers: { origin: 'https://elsewhere.example' } })).status, 403)
    assert.equal((await request(handler, valid, { raw: 'x'.repeat(9000) })).status, 413)
    assert.equal((await request(handler, valid)).status, 429)
    assert.equal((await request(handler, valid, { ip: '127.0.0.2', headers: { origin: 'http://localhost:5188' } })).status, 200)
  } finally { handler.close() }
})
test('momentum stats stay hidden until the configured threshold, then expose rounded counts only', async () => {
  const off = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 50 })
  const on = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 50, momentumThreshold: 2 })
  const stats = (handler) => request(handler, undefined, { method: 'GET', raw: '', url: '/api/waitlist/stats' })
  try {
    await request(off, valid); await request(off, { ...valid, email: 'b@example.com' })
    assert.deepEqual((await stats(off)).data, { show: false })
    await request(on, valid)
    assert.deepEqual((await stats(on)).data, { show: false })
    await request(on, { ...valid, email: 'cafe@example.com', track: 'business', businessName: 'Cafe', category: 'Retail', city: 'accra' })
    assert.deepEqual((await stats(on)).data, { show: true, walkers: 1, businesses: 1, cities: 1 })
    assert.equal((await request(on, valid, { url: '/api/waitlist/stats' })).status, 405)
  } finally { off.close(); on.close() }
})
