// Checks the SMTP settings in .env and sends one sample team alert plus one sample confirmation.
// Usage: npm run email:test            (confirmation goes to the team address)
//        npm run email:test -- you@x.com (confirmation goes to that address instead)
import { createSignupNotifier, DEFAULT_NOTIFY_EMAIL } from '../server/notify.js'
const notify = createSignupNotifier()
if (!notify.enabled) { console.error('Email is off: set SMTP_USER and SMTP_PASS in .env first.'); process.exit(1) }
try { await notify.verify(); console.log('Signed in to the mail server.') }
catch (err) { console.error(`Could not sign in to the mail server (${err.code || err.message}). For Gmail, use a Google App Password, not the account password.`); process.exit(1) }
const to = process.argv[2] || process.env.WAITLIST_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL
const result = await notify({ email: to, track: 'walker', firstName: 'Test', city: 'Accra', createdAt: new Date().toISOString() })
console.log(result.team && result.confirmation ? `Sent: a team alert to ${process.env.WAITLIST_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL} and a confirmation to ${to}. Check the inbox (and spam).` : `Something failed: ${JSON.stringify(result)}`)
process.exit(result.team && result.confirmation ? 0 : 1)
