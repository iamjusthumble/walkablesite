// Sends one sample team alert plus one sample confirmation through Resend, using RESEND_API_KEY and EMAIL_FROM from .env.
// Usage: npm run email:test            (confirmation goes to the team address)
//        npm run email:test -- you@x.com (confirmation goes to that address instead)
import { createSignupNotifier, DEFAULT_NOTIFY_EMAIL } from '../server/notify.js'
const notify = createSignupNotifier()
if (!notify.enabled) { console.error('Email is off: set RESEND_API_KEY (and EMAIL_FROM) in .env first.'); process.exit(1) }
const to = process.argv[2] || process.env.WAITLIST_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL
const result = await notify({ email: to, track: 'walker', firstName: 'Test', city: 'Accra', createdAt: new Date().toISOString() })
console.log(result.team && result.confirmation ? `Sent: a team alert to ${process.env.WAITLIST_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL} and a confirmation to ${to}. Check the inbox (and spam), and the Resend dashboard's Emails log.` : `Something failed: ${JSON.stringify(result)}. The error above names the Resend error; check the API key and that EMAIL_FROM uses the verified domain.`)
process.exit(result.team && result.confirmation ? 0 : 1)
