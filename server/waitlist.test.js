import test from 'node:test'
import assert from 'node:assert/strict'
import { Readable } from 'node:stream'
import { mkdtempSync, rmSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { createWaitlistHandler as createHandler } from './waitlist.js'
import { createSignupNotifier } from './notify.js'
const createWaitlistHandler = (opts = {}) => createHandler({ notify: async () => false, ...opts })
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
    assert.deepEqual((await request(handler, valid)).data, { success: true, duplicate: false, confirmationEmail: false })
    handler.close(); handler = createWaitlistHandler({ databasePath })
    assert.deepEqual((await request(handler, { ...valid, email: ' WALKER@EXAMPLE.COM ' })).data, { success: true, duplicate: true, confirmationEmail: false })
    assert.deepEqual((await request(handler, { ...valid, track: 'business', businessName: 'Corner Cafe', category: 'Food & Drink', footTraffic: '120' })).data, { success: true, duplicate: false, confirmationEmail: false })
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
test('only new, real signups are emailed to the team', async () => {
  const sent = []
  const handler = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 50, notify: async (lead) => { sent.push(lead) } })
  try {
    await request(handler, valid)
    await request(handler, { ...valid, email: 'WALKER@example.com' })
    await request(handler, { ...valid, email: 'bot@example.com', website: 'spam' })
    await request(handler, { ...valid, email: 'cafe@example.com', track: 'business', businessName: 'Corner Cafe', category: 'Food & Drink', footTraffic: '300' })
    assert.deepEqual(sent.map(l => [l.email, l.track]), [['walker@example.com', 'walker'], ['cafe@example.com', 'business']])
    assert.equal(sent[1].businessName, 'Corner Cafe')
  } finally { handler.close() }
})
test('each new signup emails the team and sends the person a confirmation', async () => {
  const mails = []
  const notify = createSignupNotifier({ env: { PUBLIC_ORIGIN: 'https://walkable.example' }, transport: { sendMail: async (m) => { mails.push(m) } } })
  const result = await notify({ email: 'cafe@example.com', track: 'business', businessName: 'Corner <b>Cafe</b>\r\nBcc: x@evil.test', category: 'Retail', city: 'Accra', footTraffic: 300, createdAt: '2026-10-09T10:00:00.000Z' })
  assert.deepEqual(result, { team: true, confirmation: true })
  const team = mails.find(m => m.to === 'walkableofficial@gmail.com')
  const confirmation = mails.find(m => m.to === 'cafe@example.com')
  assert.equal(team.replyTo, 'cafe@example.com')
  assert.ok(!/[\r\n]/.test(team.subject))
  assert.match(team.text, /Category: Retail/)
  assert.equal(confirmation.replyTo, 'walkableofficial@gmail.com')
  assert.equal(confirmation.subject, 'Welcome to the Walkable Founding Vendor list')
  assert.match(confirmation.text, /in Accra/)
  assert.ok(!confirmation.html.includes('<b>Cafe</b>'), 'user input is escaped in HTML')
  assert.match(confirmation.html, /https:\/\/walkable\.example\/images\/walkable-logo\.png/)
  mails.length = 0
  await notify({ email: 'erica@example.com', track: 'walker', firstName: 'Erica', city: '', createdAt: '' })
  const walker = mails.find(m => m.to === 'erica@example.com')
  assert.equal(walker.subject, 'You’re on the Walkable waitlist')
  assert.match(walker.text, /^Hi Erica,/)
  assert.match(walker.text, /in your area/)
})
test('confirmations can be turned off, failures are reported, and the API flags when one was sent', async () => {
  const mails = []
  const teamOnly = createSignupNotifier({ env: { WAITLIST_CONFIRMATION_EMAILS: 'off' }, transport: { sendMail: async (m) => { mails.push(m) } } })
  assert.deepEqual(await teamOnly({ email: 'a@example.com', track: 'walker', createdAt: '' }), { team: true, confirmation: false })
  assert.deepEqual(mails.map(m => m.to), ['walkableofficial@gmail.com'])
  const failing = createSignupNotifier({ env: {}, transport: { sendMail: async () => { throw Object.assign(new Error('x'), { code: 'EAUTH' }) } } })
  assert.deepEqual(await failing({ email: 'a@example.com', track: 'walker', createdAt: '' }), { team: false, confirmation: false })
  const on = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 50, notify: Object.assign(async () => ({}), { enabled: true, confirmations: true }) })
  const off = createWaitlistHandler({ databasePath: ':memory:', rateLimit: 50 })
  try {
    assert.equal((await request(on, valid)).data.confirmationEmail, true)
    assert.equal((await request(on, valid)).data.confirmationEmail, false, 'no confirmation for a duplicate')
    assert.equal((await request(off, valid)).data.confirmationEmail, false)
  } finally { on.close(); off.close() }
})
