import nodemailer from 'nodemailer'

export const DEFAULT_NOTIFY_EMAIL = 'walkableofficial@gmail.com'

const oneLine = (v) => String(v ?? '').replace(/[\r\n]+/g, ' ').trim()
const escapeHtml = (v) => oneLine(v).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c])

// The team alert: every new signup's details, with Reply-To set to the person.
export function teamEmail(lead) {
  const business = lead.track === 'business'
  const rows = business
    ? [['Business', lead.businessName], ['Contact email', lead.email], ['Category', lead.category], ['City', lead.city], ['Monthly foot traffic', lead.footTraffic ?? 'Not given']]
    : [['Email', lead.email], ['First name', lead.firstName || 'Not given'], ['City', lead.city || 'Not given']]
  return {
    subject: oneLine(business ? `New founding vendor: ${lead.businessName} (${lead.city})` : `New walker on the waitlist: ${lead.email}`).slice(0, 200),
    text: [`New ${business ? 'business (Founding Vendor)' : 'walker'} signup on the Walkable waitlist.`, '', ...rows.map(([k, v]) => `${k}: ${oneLine(v)}`), `Signed up: ${lead.createdAt}`, '', 'They agreed to receive updates about Walkable.'].join('\n'),
  }
}

// The confirmation the person receives right after joining.
export function confirmationEmail(lead, { siteUrl = '' } = {}) {
  const business = lead.track === 'business'
  const greeting = business ? `Hi ${oneLine(lead.businessName)} team,` : `Hi ${oneLine(lead.firstName) || 'there'},`
  const where = lead.city ? ` in ${oneLine(lead.city)}` : ' in your area'
  const paragraphs = business
    ? [
        'Thanks for joining the Walkable Founding Vendor list. Your business is on our early access list.',
        `As the founding cohort opens${where}, we’ll reach out personally to set up your first walking challenge and reward with you. It’s free to join, with no commitment.`,
        'Got questions in the meantime? Just reply to this email.',
      ]
    : [
        'Thanks for joining! A little more fresh air, a little more to look forward to.',
        `We’re opening access city by city, and we’ll email you as soon as Walkable is ready${where}.`,
        siteUrl ? `Know someone who’d enjoy it? Share Walkable with a friend: ${siteUrl}` : 'Know someone who’d enjoy it? Tell a friend to join the waitlist too.',
      ]
  const footer = `You’re getting this because this email address was used to join the Walkable waitlist${siteUrl ? ` at ${siteUrl}` : ''}. Didn’t sign up? Reply to this email and we’ll remove you.`
  const subject = business ? 'Welcome to the Walkable Founding Vendor list' : 'You’re on the Walkable waitlist'
  const text = [greeting, '', ...paragraphs.flatMap(p => [p, '']), 'See you out there,', 'The Walkable team', '', '—', footer].join('\n')
  const p = (t) => `<p style="margin:0 0 16px;font-size:16px;line-height:1.6;color:#3d2e4d">${escapeHtml(t)}</p>`
  const logo = siteUrl ? `<img src="${escapeHtml(siteUrl)}/images/walkable-logo.png" width="96" alt="Walkable" style="display:block;margin:0 0 24px;border:0">` : '<p style="margin:0 0 24px;font:800 26px Arial,sans-serif;color:#2e1065">Walkable</p>'
  const cta = siteUrl && !business ? `<p style="margin:8px 0 24px"><a href="${escapeHtml(siteUrl)}" style="display:inline-block;background:#7c3ff2;color:#ffffff;text-decoration:none;font-weight:600;padding:12px 22px;border-radius:14px">Share Walkable with a friend</a></p>` : ''
  const html = `<!doctype html><html><body style="margin:0;padding:24px;background:#f1eafa;font-family:Arial,Helvetica,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:20px"><tr><td style="padding:32px">
${logo}<h1 style="margin:0 0 20px;font-size:24px;line-height:1.25;color:#26183c">${escapeHtml(subject)}</h1>
${p(greeting)}${(business || !siteUrl ? paragraphs : paragraphs.slice(0, 2)).map(p).join('')}${cta}
${p('See you out there,')}<p style="margin:-12px 0 0;font-size:16px;color:#3d2e4d;font-weight:600">The Walkable team</p>
</td></tr></table>
<p style="max-width:520px;margin:16px auto 0;font-size:12px;line-height:1.5;color:#756c7f">${escapeHtml(footer)}</p>
</td></tr></table></body></html>`
  return { subject, text, html }
}

// Sends the team alert and the person's confirmation for each new signup.
// The lead is saved before this runs, so a mail failure is logged and never
// loses a signup. With no SMTP credentials configured it sends nothing.
export function createSignupNotifier({ env = process.env, transport } = {}) {
  const team = env.WAITLIST_NOTIFY_EMAIL || DEFAULT_NOTIFY_EMAIL
  const user = env.SMTP_USER
  const mailer = transport || (user && env.SMTP_PASS ? nodemailer.createTransport({
    host: env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(env.SMTP_PORT || 465),
    secure: Number(env.SMTP_PORT || 465) === 465,
    auth: { user, pass: env.SMTP_PASS },
  }) : null)
  if (!mailer) {
    console.warn(`Waitlist emails are off: set SMTP_USER and SMTP_PASS to email new signups to ${team} and send confirmations.`)
    const off = async () => ({ team: false, confirmation: false })
    off.enabled = false
    return off
  }
  const from = env.MAIL_FROM || `Walkable <${user || team}>`
  const confirmations = env.WAITLIST_CONFIRMATION_EMAILS !== 'off'
  let siteUrl = ''
  try { if (env.PUBLIC_ORIGIN) siteUrl = new URL(env.PUBLIC_ORIGIN).origin } catch { /* invalid origin: send without links */ }
  const send = async (label, message) => {
    try { await mailer.sendMail({ from, ...message }); return true }
    catch (err) { console.error(`Waitlist ${label} email failed:`, err.code || err.name || 'error'); return false }
  }
  async function notify(lead) {
    const [teamSent, confirmationSent] = await Promise.all([
      send('team', { to: team, replyTo: oneLine(lead.email), ...teamEmail(lead) }),
      confirmations ? send('confirmation', { to: oneLine(lead.email), replyTo: team, ...confirmationEmail(lead, { siteUrl }) }) : false,
    ])
    return { team: teamSent, confirmation: confirmationSent }
  }
  notify.enabled = true
  notify.confirmations = confirmations
  return notify
}
