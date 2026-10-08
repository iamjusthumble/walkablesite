import { useEffect, useRef, useState } from 'react'
import './App.css'
import { faqs } from './faqs.js'
import { mountOrb } from './orbs.js'
import logoStacked from './assets/Logo1.png'
import logoWordmark from './assets/Logo2.png'

function Icon({ name, size = 24, ...props }) {
  const paths = {
    walk: <><circle cx="14" cy="4" r="2"/><path d="m7 21 4-7 3 3v4M8 11l3-4 4 1 3 4h3M11 7l-1 7-5 3"/></>,
    pin: <><path d="M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 1 1 16 0Z"/><circle cx="12" cy="10" r="2.5"/></>,
    gift: <><rect x="3" y="8" width="18" height="4" rx="1"/><path d="M5 12v9h14v-9M12 8v13"/><path d="M12 8H8a3 3 0 1 1 3-3l1 3Zm0 0h4a3 3 0 1 0-3-3l-1 3Z"/></>,
    coffee: <><path d="M4 8h13v7a5 5 0 0 1-5 5H9a5 5 0 0 1-5-5ZM17 9h2a3 3 0 1 1 0 6h-2M7 2v3M11 1v4M15 2v3M2 23h18"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    route: <><circle cx="5" cy="5" r="3"/><circle cx="19" cy="19" r="3"/><path d="M8 5h8a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h8"/></>,
    shop: <><path d="m3 9 2-6h14l2 6M3 9a3 3 0 0 0 6 0 3 3 0 0 0 6 0 3 3 0 0 0 6 0M5 12v9h14v-9M10 21v-6h4v6"/></>,
    heart: <path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>,
    spark: <><path d="m12 2 2.8 7.2L22 12l-7.2 2.8L12 22l-2.8-7.2L2 12l7.2-2.8Z"/></>,
    arrow: <path d="M5 12h14m-6-6 6 6-6 6"/>,
    close: <path d="m6 6 12 12M6 18 18 6"/>,
    menu: <path d="M4 6h16M4 12h16M4 18h16"/>,
    plus: <path d="M12 5v14M5 12h14"/>,
    mail: <><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m3 7 9 6 9-6"/></>,
    shield: <><path d="m12 2 8 4v6c0 6-8 10-8 10S4 18 4 12V6Z"/><path d="m8 12 3 3 5-6"/></>,
    target: <><circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="5"/><circle cx="12" cy="12" r="1"/></>,
    phone: <><rect x="6" y="2" width="12" height="20" rx="3"/><path d="M11 18h2"/></>,
    users: <><circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0M16 4.5a3.5 3.5 0 0 1 0 7M18 14a6 6 0 0 1 3.5 6"/></>,
    x: <path d="M4 4l16 16M20 4 4 20"/>,
  }
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...props}>{paths[name] || paths.walk}</svg>
}
// Official Walkable logos: horizontal wordmark for the header, stacked logo with the shoe-print mark for the footer.
function Brand({ stacked = false }) { return <a href="/" className={`brand ${stacked ? 'brand-stacked' : ''}`}><img src={stacked ? logoStacked : logoWordmark} alt="Walkable home" width={stacked ? 299 : 298} height={stacked ? 322 : 106}/></a> }
function trackEvent(name, props = {}) { window.dispatchEvent(new CustomEvent('walkable:analytics', { detail: { name, props } })); if (window.plausible) window.plausible(name, { props }) }

// Optional public details. Each is hidden until its approved value is set at build time.
const env = import.meta.env
const contactEmail = env.VITE_CONTACT_EMAIL || ''
const socials = [['Instagram', env.VITE_SOCIAL_INSTAGRAM], ['TikTok', env.VITE_SOCIAL_TIKTOK], ['LinkedIn', env.VITE_SOCIAL_LINKEDIN], ['X', env.VITE_SOCIAL_X]].filter(([, url]) => url)
// Social proof (PRD 9.5). Add only real, approved content; empty lists stay hidden.
const testimonials = [] // [{ quote, name, role }]

const links = [['how-it-works', 'How it works'], ['features', 'Features'], ['for-business', 'For business'], ['faq', 'FAQ']]
// [photo, orb state, title, description, photo alt]
const steps = [
  ['discover', 'searching', 'Discover a nearby challenge', 'Browse walking routes sponsored by brands and local businesses near you.', 'A smiling woman checks her phone while walking down a sunny street'],
  ['walk', 'working', 'Walk it, live-tracked', 'Your route, distance, and time are tracked on the map as you go. No manual logging.', 'A man walks along a tree-lined park path toward the city'],
  ['earn', 'solving', 'Earn your reward', 'Finish the distance before the challenge ends and your reward unlocks instantly.', 'A young woman smiles at her phone next to a cup of coffee'],
  ['redeem', 'shaping', 'Redeem it, in person', 'Show your voucher code in-store or online. No points to convert, no catch.', 'A barista hands a coffee to a customer across the counter'],
]
const differences = [
  ['Not a points app.', 'Rewards are specific, named vouchers from a real challenge, not a currency to convert later.'],
  ['Not another check-in.', 'What earns the reward is a verified walk, not a check-in or a review.'],
  ['Not a fitness tracker.', 'Tracking is how you earn, not the point. Made for everyday walkers, not athletes.'],
]
// [screen, headline, copy, screenshot alt, orb state]
const features = [
  ['home', 'See your progress at a glance', 'A weekly goal ring and daily stats that make the habit visible, not buried in a menu.', 'Home dashboard with a weekly walking goal ring, daily stats, and nearby challenges', 'listening'],
  ['challenge', 'Challenges from brands you already love', 'Real distances, real rewards, real spot limits. Not generic point multipliers.', 'Challenge detail screen showing distance, reward, and a join button for a sample sponsored walk', 'searching'],
  ['map', 'Every step verified, every walk counted', 'GPS-tracked routes mean rewards go to people who actually walked them. Pause, resume, or end anytime.', '', 'working'],
  ['rewards', 'Real rewards. No points to convert.', 'Vouchers sit in your wallet ready to redeem, with active, redeemed, and expired all in one place.', 'Rewards wallet listing sample active, redeemed, and expired vouchers', 'shaping'],
]
const vendorProps = [
  ['target', 'Reach health-motivated locals', 'Your challenge appears on the in-app map to nearby people already out walking. Not a cold audience.'],
  ['check', 'Pay only for completed visits', 'Your reward is only spent when a real person finishes the walk and redeems in your store. No impressions, no wasted clicks.'],
  ['users', 'Simple setup, we onboard you', 'Tell us the reward, we’ll shape the challenge with you. No dashboard to learn on day one.'],
]

function WaitlistForm({ initialTrack = 'walker', context = 'in-page' }) {
  const [track, setTrack] = useState(initialTrack)
  const [values, setValues] = useState({ email: '', firstName: '', city: '', businessName: '', category: '', footTraffic: '', consent: true, website: '' })
  const [errors, setErrors] = useState({})
  const [state, setState] = useState('idle')
  const [message, setMessage] = useState('')
  const [copied, setCopied] = useState(false)
  const formRef = useRef(null)
  const started = useRef(false)
  useEffect(() => {
    // The modal is opened on purpose; the in-page form counts as opened once it is actually seen.
    if (context === 'modal') { trackEvent('waitlist_form_open', { trigger: context, track: initialTrack }); return }
    const observer = new IntersectionObserver(([entry]) => { if (entry.isIntersecting) { trackEvent('waitlist_form_open', { trigger: context, track: initialTrack }); observer.disconnect() } }, { threshold: 0.4 })
    if (formRef.current) observer.observe(formRef.current)
    return () => observer.disconnect()
  }, [context, initialTrack])
  const markStarted = () => { if (!started.current) { started.current = true; trackEvent('waitlist_form_start', { trigger: context, track }) } }
  const switchTrack = (next) => { if (next === track) return; setTrack(next); setErrors({}); setMessage(''); trackEvent('waitlist_track_switch', { trigger: context, track: next }) }
  const validate = (key) => {
    const v = String(values[key] || '').trim()
    if (key === 'email' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)) return 'Enter a valid email address, like you@example.com.'
    if (track === 'business' && ['businessName', 'category', 'city'].includes(key) && !v) return `Please ${key === 'category' ? 'choose a category' : `enter your ${key === 'businessName' ? 'business name' : 'city'}`}.`
    if (track === 'business' && key === 'footTraffic' && v && (!/^\d+$/.test(v) || Number(v) > 100000000)) return 'Enter a whole number of monthly visits, like 1200.'
    if (key === 'consent' && !values.consent) return 'Please agree to receive waitlist updates so we can invite you.'
    return ''
  }
  const describedBy = (key) => errors[key] ? `${context}-${key}-error` : undefined
  const update = (key, value) => { setValues(v => ({ ...v, [key]: value })); setErrors(e => ({ ...e, [key]: '' })) }
  const field = (key, label, placeholder, required = false, type = 'text', extra = {}) => <div className={`field field-${key}`}><label htmlFor={`${context}-${key}`}>{label}{!required && <span> (optional)</span>}</label><input id={`${context}-${key}`} name={key} type={type} value={values[key]} placeholder={placeholder} autoComplete={key === 'email' ? 'email' : key === 'firstName' ? 'given-name' : key === 'city' ? 'address-level2' : key === 'businessName' ? 'organization' : 'off'} required={required} maxLength={key === 'email' ? 254 : 120} aria-invalid={!!errors[key]} aria-describedby={describedBy(key)} onChange={e => update(key, e.target.value)} onBlur={() => setErrors(e => ({ ...e, [key]: validate(key) }))} {...extra}/>{errors[key] && <span className="field-error" id={`${context}-${key}-error`}>{errors[key]}</span>}</div>
  async function submit(e) {
    e.preventDefault()
    const nextErrors = Object.fromEntries(Object.keys(values).map(k => [k, validate(k)]).filter(([, v]) => v))
    setErrors(nextErrors)
    if (Object.keys(nextErrors).length) { trackEvent('waitlist_submit_error', { error_type: 'validation', track }); requestAnimationFrame(() => formRef.current?.querySelector('[aria-invalid="true"]')?.focus()); return }
    setState('loading'); setMessage('')
    try {
      const res = await fetch('/api/waitlist', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...values, track }) })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw Object.assign(new Error(data.message || 'Something went wrong. Please try again.'), { status: res.status })
      setState(data.duplicate ? 'duplicate' : 'success')
      trackEvent('waitlist_submit_success', { track, city: values.city.trim(), duplicate: !!data.duplicate })
    } catch (err) { setState('error'); setMessage(err.message === 'Failed to fetch' ? 'We couldn’t connect. Please check your connection and try again.' : err.message); trackEvent('waitlist_submit_error', { error_type: err.status ? `http_${err.status}` : 'network', track }) }
  }
  async function share() {
    const url = `${window.location.origin}/`
    const text = 'I just joined the Walkable waitlist. Everyday walks, real local rewards.'
    try {
      if (navigator.share) { await navigator.share({ title: 'Walkable', text, url }); trackEvent('waitlist_share', { method: 'native', track }); return }
      await navigator.clipboard.writeText(url); setCopied(true); trackEvent('waitlist_share', { method: 'copy', track })
    } catch (err) { if (err?.name !== 'AbortError') setMessage(`Share this link with a friend: ${url}`) }
  }
  if (state === 'success' || state === 'duplicate') return <div className="success-state" role="status" aria-live="polite"><span className="success-icon"><Icon name="check" size={34}/></span><p className="eyebrow">YOUR NEXT CHAPTER STARTS HERE</p><h3>{state === 'duplicate' ? 'You’re already on the list!' : 'You’re on the list.'}</h3><p>{state === 'duplicate' ? 'Good news: we already have your spot saved. Nothing else to do.' : track === 'business' ? 'Your business is on the Founding Vendor list. We’ll reach out personally as the cohort opens in your city.' : 'A little more fresh air. A little more to look forward to. We’ll email you when access opens in your area.'}</p><button type="button" className="button button-primary" onClick={share}>{copied ? 'Link copied!' : 'Share with a friend'}<Icon name={copied ? 'check' : 'heart'} size={18}/></button>{message && <p className="share-fallback">{message}</p>}</div>
  return <form ref={formRef} className="waitlist-form" onSubmit={submit} onFocus={markStarted} noValidate aria-label={track === 'walker' ? 'Walker waitlist' : 'Business waitlist'}>
    <div className="track-toggle" role="group" aria-label="Choose your waitlist"><button type="button" aria-pressed={track === 'walker'} className={track === 'walker' ? 'selected' : ''} onClick={() => switchTrack('walker')}><Icon name="walk" size={19}/>I’m a walker</button><button type="button" aria-pressed={track === 'business'} className={track === 'business' ? 'selected' : ''} onClick={() => switchTrack('business')}><Icon name="shop" size={19}/>I’m a business</button></div>
    <div className="form-heading"><h3>{track === 'walker' ? 'Good things are a walk away.' : 'Meet your next regulars.'}</h3><p>{track === 'walker' ? 'Be first to know when Walkable lands near you.' : 'Join the free Founding Vendor early access list. Takes under a minute.'}</p></div>
    <div className="form-fields">
      {track === 'business' && field('businessName', 'Business name', 'e.g. Corner Street Coffee', true)}
      {field('email', track === 'business' ? 'Contact email' : 'Email address', 'you@example.com', true, 'email', { inputMode: 'email', spellCheck: false })}
      {track === 'walker' && field('firstName', 'First name', 'Your first name')}
      {track === 'business' && <div className="field"><label htmlFor={`${context}-category`}>Business category</label><select id={`${context}-category`} required value={values.category} aria-invalid={!!errors.category} aria-describedby={describedBy('category')} onBlur={() => setErrors(e => ({ ...e, category: validate('category') }))} onChange={e => update('category', e.target.value)}><option value="">Select a category</option>{['Food & Drink', 'Retail', 'Fitness', 'Other'].map(c => <option key={c}>{c}</option>)}</select>{errors.category && <span className="field-error" id={`${context}-category-error`}>{errors.category}</span>}</div>}
      {field('city', 'City', track === 'business' ? 'Where is your business?' : 'Where do you walk?', track === 'business')}
      {track === 'business' && field('footTraffic', 'Estimated monthly foot traffic', 'Approximate visits per month', false, 'text', { inputMode: 'numeric', pattern: '[0-9]*' })}
    </div>
    {track === 'walker' && <p className="field-hint">Adding your city helps us choose our first launch cities.</p>}
    <div className="honeypot" aria-hidden="true"><label>Website<input tabIndex="-1" autoComplete="off" value={values.website} onChange={e => setValues({ ...values, website: e.target.value })}/></label></div>
    <label className="consent"><input type="checkbox" checked={values.consent} aria-invalid={!!errors.consent} aria-describedby={describedBy('consent')} onChange={e => update('consent', e.target.checked)}/>I’d like to receive updates about Walkable.</label>{errors.consent && <span className="field-error" id={`${context}-consent-error`}>{errors.consent}</span>}
    {message && <p className="form-error" role="alert">{message}</p>}
    <button className="button button-primary submit-button" disabled={state === 'loading'} aria-busy={state === 'loading'}>{state === 'loading' ? 'Saving your spot…' : track === 'walker' ? 'Count me in' : 'Join the founding cohort'}{state === 'loading' ? <Orb state="working" size={22} palette="white"/> : <Icon name="arrow" size={19}/>}</button>
    <p className="form-note"><Icon name="shield" size={14}/>Just the good stuff. Unsubscribe anytime. <a href="/privacy">Privacy</a></p>
  </form>
}
// Animated dotted orb (see orbs.js). Decorative unless given a label.
function Orb({ state = 'working', size = 64, palette = 'purple', className = '' }) {
  const ref = useRef(null)
  useEffect(() => mountOrb(ref.current, { state, size, palette, tuning: size >= 300 ? 'hero' : size >= 40 ? 64 : 20 }), [state, size, palette])
  return <canvas ref={ref} className={`orb ${className}`} width={size} height={size} style={{ width: size, height: size }} aria-hidden="true"/>
}
function Photo({ name, alt, width, height, className = '' }) {
  return <picture className={`photo ${className}`}><source srcSet={`/images/people/${name}.webp`} type="image/webp"/><img src={`/images/people/${name}.jpg`} alt={alt} width={width} height={height} loading="lazy" decoding="async"/></picture>
}
function Phone({ screen = 'home', className = '', eager = false, alt }) {
  return <div className={`phone ${className}`}><picture><source srcSet={[400, 600, 820].map(w => `/images/app-${screen}-${w}.webp ${w}w`).join(', ')} sizes="(max-width: 480px) 210px, 275px" type="image/webp"/><img src={`/images/app-${screen}.png`} width="600" height="1305" loading={eager ? 'eager' : 'lazy'} decoding="async" fetchPriority={eager ? 'high' : 'auto'} alt={alt}/></picture></div>
}
// No real-device capture of live tracking exists yet (PRD §3), so this is a clearly labelled illustration.
function MapIllustration() {
  return <div className="phone map-phone" role="img" aria-label="Illustration of live walk tracking: a map with a dashed planned route, a green trail of the distance walked, and pause and end controls">
    <svg viewBox="0 0 386 840" aria-hidden="true">
      <rect width="386" height="840" fill="#f3f0ea"/>
      <g stroke="#fff" strokeWidth="22" fill="none" strokeLinecap="round"><path d="M-20 210 L410 150"/><path d="M-20 470 L410 520"/><path d="M110 -20 L80 860"/><path d="M290 -20 L310 860"/><path d="M-20 700 L410 640"/></g>
      <rect x="140" y="250" width="110" height="180" rx="14" fill="#dcebd0"/><rect x="20" y="560" width="40" height="70" rx="10" fill="#dcebd0"/><circle cx="355" cy="330" r="40" fill="#cfe3f3"/>
      <path d="M80 640 C 90 520, 95 480, 200 495 S 300 400, 300 300 S 250 180, 300 160" fill="none" stroke="#8c52ff" strokeWidth="6" strokeDasharray="4 13" strokeLinecap="round"/>
      <path d="M80 640 C 90 520, 95 480, 200 495 S 296 420, 299 360" fill="none" stroke="#3fae5a" strokeWidth="9" strokeLinecap="round"/>
      <circle cx="299" cy="360" r="16" fill="#3fae5a" opacity=".25"/><circle cx="299" cy="360" r="9" fill="#3fae5a" stroke="#fff" strokeWidth="4"/>
      <path d="M300 160c0-18 26-18 26 0 0 14-13 28-13 28s-13-14-13-28Z" transform="translate(-13 -40)" fill="#8c52ff"/><circle cx="300" cy="134" r="5" fill="#fff"/>
      <rect x="24" y="64" width="338" height="78" rx="22" fill="#fff"/>
      <text x="48" y="96" fontFamily="Instrument Sans, sans-serif" fontSize="15" fill="#756c7f">Distance</text><text x="48" y="124" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="24" fill="#26183c">1.4 / 2.0 km</text>
      <text x="236" y="96" fontFamily="Instrument Sans, sans-serif" fontSize="15" fill="#756c7f">Time</text><text x="236" y="124" fontFamily="Bricolage Grotesque, sans-serif" fontWeight="700" fontSize="24" fill="#26183c">18:42</text>
      <rect x="24" y="724" width="160" height="62" rx="20" fill="#fff"/><text x="104" y="762" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontWeight="600" fontSize="18" fill="#2e1065">Pause</text>
      <rect x="202" y="724" width="160" height="62" rx="20" fill="#8c52ff"/><text x="282" y="762" textAnchor="middle" fontFamily="Instrument Sans, sans-serif" fontWeight="600" fontSize="18" fill="#fff">End walk</text>
    </svg>
  </div>
}
function Modal({ track, close }) {
  const ref = useRef(null)
  useEffect(() => {
    const dialog = ref.current
    const opener = document.activeElement
    dialog.showModal()
    const old = document.body.style.overflow; document.body.style.overflow = 'hidden'
    return () => { document.body.style.overflow = old; if (dialog.open) dialog.close(); if (opener instanceof HTMLElement) opener.focus({ preventScroll: true }) }
  }, [])
  return <dialog ref={ref} className="signup-dialog" aria-labelledby="dialog-title" onCancel={e => { e.preventDefault(); close() }} onClick={e => { if (e.target === ref.current) close() }}><div className="dialog-inner"><button type="button" className="close-button" aria-label="Close signup" onClick={close}><Icon name="close"/></button><span className="eyebrow" id="dialog-title">LET’S TAKE THE FIRST STEP</span><WaitlistForm initialTrack={track} context="modal"/></div></dialog>
}
// Honest momentum (PRD 9.5): the server only returns counts once they pass an owner-set threshold.
function Proof() {
  const [stats, setStats] = useState(null)
  useEffect(() => { fetch('/api/waitlist/stats').then(r => r.ok ? r.json() : null).then(d => { if (d?.show) setStats(d) }).catch(() => {}) }, [])
  if (!stats && !testimonials.length) return null
  return <section id="proof" className="proof-section section-pad container" aria-labelledby="proof-title">
    <div className="center-heading"><p className="eyebrow">THE GOOD KIND OF MOMENTUM</p><h2 id="proof-title">People are lacing up.</h2></div>
    {stats && <div className="momentum">{[[stats.walkers, 'walkers on the waitlist'], [stats.businesses, 'businesses in the founding cohort'], [stats.cities, 'cities requested']].filter(([n]) => n > 0).map(([n, label]) => <div key={label}><strong>{n.toLocaleString('en-US')}+</strong><span>{label}</span></div>)}</div>}
    {testimonials.length > 0 && <div className="testimonials">{testimonials.map(t => <figure key={t.name}><blockquote>“{t.quote}”</blockquote><figcaption><strong>{t.name}</strong>{t.role}</figcaption></figure>)}</div>}
  </section>
}
function App({ pagePath } = {}) {
  const [menu, setMenu] = useState(false)
  const [modal, setModal] = useState(null)
  const [active, setActive] = useState('')
  const [pageTrack, setPageTrack] = useState('walker')
  const path = pagePath || (typeof window !== 'undefined' ? window.location.pathname : '/')
  const open = (track = 'walker', location = 'hero') => { setModal(track); setMenu(false); trackEvent('cta_click', { location, track }) }
  const goToWaitlist = (track = 'walker', location = 'hero') => {
    setPageTrack(track); setMenu(false); trackEvent('cta_click', { location, track })
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    requestAnimationFrame(() => { document.getElementById('waitlist')?.scrollIntoView({ behavior: reduce ? 'auto' : 'smooth' }); document.querySelector('#waitlist input[type="email"]')?.focus({ preventScroll: true }) })
  }
  useEffect(() => {
    trackEvent('page_view', { referrer: document.referrer, device_type: window.innerWidth < 768 ? 'mobile' : window.innerWidth <= 1024 ? 'tablet' : 'desktop' })
    const observer = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) setActive(e.target.id) }), { rootMargin: '-20% 0px -55% 0px' })
    document.querySelectorAll('main section[id]').forEach(el => observer.observe(el))
    // Only animate sections that start below the fold, so pre-rendered content never flashes.
    const reveal = new IntersectionObserver(entries => entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('revealed'); reveal.unobserve(e.target) } }), { threshold: 0.08 })
    document.querySelectorAll('.reveal').forEach(el => { if (el.getBoundingClientRect().top > window.innerHeight) { el.classList.add('pending'); reveal.observe(el) } })
    const waitlist = document.getElementById('waitlist')
    const depth = new IntersectionObserver(([e]) => { if (e.isIntersecting) { trackEvent('waitlist_section_view'); depth.disconnect() } }, { threshold: 0.25 })
    if (waitlist) depth.observe(waitlist)
    const onKey = e => { if (e.key === 'Escape') setMenu(false) }
    window.addEventListener('keydown', onKey)
    return () => { observer.disconnect(); reveal.disconnect(); depth.disconnect(); window.removeEventListener('keydown', onKey) }
  }, [])
  if (['/privacy', '/terms', '/press'].includes(path)) return <div className="legal-page"><Brand/><a className="back-link" href="/">← Back to Walkable</a><p className="eyebrow">WALKABLE · PRE-LAUNCH</p><h1>{path === '/privacy' ? 'Privacy policy' : path === '/terms' ? 'Terms of service' : 'Press & media'}</h1><p>{path === '/press' ? 'Our press kit is being prepared. Explore the website for a first look at Walkable and the product.' : 'This page is being prepared for public launch. Final legal terms have not yet been published.'}</p><p>{path === '/privacy' ? 'The waitlist collects the details you submit, your chosen walker or business track, and your consent preference so the Walkable team can manage early access. No advertising trackers are installed on this website.' : 'Launch availability and details will be shared with waitlist members as they are confirmed.'}</p>{contactEmail && <p>Questions? Email <a className="inline-link" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</p>}<a className="button button-primary" href="/">Explore Walkable</a></div>
  return <>
    <a className="skip-link" href="#main">Skip to content</a>
    <header className="site-header"><div className="nav-wrap"><Brand/><nav id="site-nav" className={menu ? 'navigation open' : 'navigation'} aria-label="Main navigation">{links.map(([id, label]) => <a key={id} href={`#${id}`} className={active === id ? 'active' : ''} aria-current={active === id ? 'true' : undefined} onClick={() => setMenu(false)}>{label}</a>)}<button type="button" className="mobile-signup button button-primary" onClick={() => open('walker', 'nav')}>Join the waitlist</button></nav><div className="nav-actions"><button type="button" className="button button-primary nav-cta" onClick={() => open('walker', 'nav')}>Join the waitlist<Icon name="arrow" size={17}/></button></div><button type="button" className="menu-button" aria-expanded={menu} aria-controls="site-nav" aria-label={menu ? 'Close navigation' : 'Open navigation'} onClick={() => setMenu(!menu)}><Icon name={menu ? 'close' : 'menu'}/></button></div></header>
    <main id="main">
      <section className="hero-section" aria-labelledby="hero-title">
        <div className="hero-grid container"><div className="hero-copy"><div className="launch-label"><span className="label-symbol">✳</span>Early access waitlist now open</div><h1 id="hero-title">Your everyday<br/>walk. <span>Now with<br/>extra good.</span></h1><p className="hero-description">Pick a walking challenge from a local business, walk it with live GPS tracking, and redeem a real reward like your next coffee.</p><div className="hero-actions"><button type="button" className="button button-primary" onClick={() => goToWaitlist('walker', 'hero')}>Join the waitlist<Icon name="arrow" size={20}/></button><a className="button button-ghost" href="#for-business" onClick={() => trackEvent('cta_click', { location: 'hero', track: 'business' })}><Icon name="shop" size={18}/>I’m a business</a></div><p className="hero-note"><Icon name="check" size={15}/>Free to join. For walkers and local businesses.</p></div>
        <div className="hero-visual"><Orb state="searching" size={560} palette="soft" className="hero-orb"/><span className="visual-spark spark-one" aria-hidden="true">✳</span><span className="visual-spark spark-two" aria-hidden="true">✦</span><div className="hero-phone-wrap"><Phone eager alt="Walkable home screen showing weekly walking progress and nearby challenges"/><span className="phone-caption">A peek at the app · sample data</span></div><div className="floating-card reward-card" aria-hidden="true"><span className="coffee-icon"><Icon name="coffee" size={31}/></span><div><span className="tiny-label">EXAMPLE CHALLENGE</span><strong>Walk 2 km.<br/>Get a free latte.</strong></div><span className="reward-check"><Icon name="check" size={14}/></span></div><div className="floating-card progress-card" aria-hidden="true"><div className="mini-ring"><Icon name="walk" size={22}/></div><div><strong>One step closer.</strong><span>Your reward unlocks at the finish.</span></div></div><span className="hand-note" aria-hidden="true">less scrolling,<br/>more strolling.<svg viewBox="0 0 80 44"><path d="M2 3c45-3 63 12 58 35m-9-9 9 9 10-9"/></svg></span></div></div>
        <ul className="hero-bottom container" aria-label="Walkable at a glance"><li><Icon name="shop" size={19}/>Challenges from local spots</li><li className="divider-star" aria-hidden="true">✳</li><li><Icon name="shield" size={19}/>GPS-verified walks</li><li className="divider-star" aria-hidden="true">✳</li><li><Icon name="gift" size={19}/>Real vouchers, no points</li><li className="hero-bottom-note">FOUNDING VENDOR COHORT NOW OPEN</li></ul>
      </section>
      <section id="how-it-works" className="how-section section-pad container" aria-labelledby="how-title"><div className="section-heading reveal"><div><p className="eyebrow">HOW IT WORKS</p><h2 id="how-title">Out the door.<br/><span>Into something good.</span></h2></div><p>No intense workouts. No complicated points.{' '}<br/>Just you, your neighborhood, and a reason to go.</p></div><ol className="steps reveal">{steps.map(([photo, orb, title, desc, alt], i) => <li className="step" key={title} style={{ '--i': i }}><div className="step-photo"><Photo name={photo} alt={alt} width={640} height={800}/><span className="step-number" aria-hidden="true">0{i + 1}</span><span className="step-orb"><Orb state={orb} size={52}/></span></div><h3>{title}</h3><p>{desc}</p></li>)}</ol>
        <div className="differences reveal"><p className="differences-title">Why it’s different</p>{differences.map(([title, desc]) => <div key={title}><Icon name="x" size={16}/><div><strong>{title}</strong><p>{desc}</p></div></div>)}</div></section>
      <section id="features" className="features-section" aria-labelledby="features-title"><div className="container section-pad"><div className="center-heading reveal"><p className="eyebrow">A WORKING PRODUCT, NOT A CONCEPT</p><h2 id="features-title">A good habit.<br/>With even better benefits.</h2><p>Real screens from the Walkable app. Everything you need to get out, explore, and come back with a little more.</p></div>
        <div className="feature-rows">{features.map(([id, title, desc, alt, orb], i) => <article key={id} className={`feature-row reveal ${i % 2 ? 'flip' : ''}`}><div className="feature-text"><span className="feature-number">0{i + 1}</span><h3>{title}</h3><p>{desc}</p>{id === 'map' && <p className="tracking-note"><Icon name="shield" size={18}/>Live GPS keeps every reward fair.</p>}</div><div className={`feature-device feature-device-${id}`}><Orb state={orb} size={110} className="feature-orb"/>{id === 'map' ? <MapIllustration/> : <Phone screen={id} alt={alt}/>}<span className="screen-disclaimer">{id === 'map' ? 'Illustration. Live tracking runs on real devices.' : 'Real app screen. Sample rewards shown.'}</span></div></article>)}</div></div></section>
      <section id="for-business" className="business-section section-pad" aria-labelledby="business-title"><div className="container business-layout"><div className="business-copy reveal"><p className="eyebrow"><Icon name="shop" size={17}/> FOR LOCAL BUSINESSES</p><h2 id="business-title">Turn foot traffic into your <span>most loyal customers.</span></h2><p>Set a walking challenge like “walk 2 km, get a free latte.” Walkable sends nearby people your way, verifies the walk by GPS, and they redeem the reward in your store.</p><div className="business-cta"><button type="button" className="button button-lime" onClick={() => open('business', 'for-business')}>Become a founding vendor<Icon name="arrow" size={20}/></button><span className="business-note">Free to join the early access cohort. No commitment.</span></div></div>
        <div className="business-proof reveal"><Orb state="working" size={220} palette="lime" className="business-orb"/><Photo name="business" alt="Two smiling baristas standing behind their coffee shop counter" width={1200} height={800} className="business-photo"/><Phone screen="profile" className="profile-phone" alt="Walkable profile screen with a Vendor Profile button next to Settings"/><div className="proof-callout"><span className="eyebrow">ALREADY IN THE APP</span><p>The Vendor Profile button ships on the Profile screen today. Challenge creation for businesses is what we’re building next.</p></div></div>
        <ul className="vendor-cards reveal">{vendorProps.map(([icon, title, desc]) => <li className="vendor-card" key={title}><span><Icon name={icon} size={24}/></span><h3>{title}</h3><p>{desc}</p></li>)}</ul></div></section>
      <Proof/>
      <section id="waitlist" className="waitlist-section section-pad container" aria-labelledby="waitlist-title"><div className="waitlist-copy reveal"><div className="community"><Photo name="community" alt="Four friends laughing together on a walk through a sunny park" width={1400} height={788}/><span className="community-orb"><Orb state="composing" size={72}/></span></div><p className="eyebrow">EVERY GOOD THING STARTS WITH A STEP</p><h2 id="waitlist-title">Let’s make<br/>your next walk<br/><span>a little better.</span></h2><p>Fresh air. New favorites. Something to look forward to. Be part of Walkable from the very first step.</p><ul className="early-access"><li><Icon name="mail" size={20}/><div><strong>An invite, when it’s your time.</strong><span>We’re opening up city by city. Tell us where you are.</span></div></li><li><Icon name="shop" size={20}/><div><strong>Run a local business?</strong><span>Switch to “I’m a business” to join the founding cohort.</span></div></li></ul></div><div className="form-card reveal"><WaitlistForm key={pageTrack} initialTrack={pageTrack}/></div></section>
      <section id="faq" className="faq-section section-pad" aria-labelledby="faq-title"><div className="container faq-layout"><div><p className="eyebrow">A FEW THINGS YOU MIGHT BE WONDERING</p><h2 id="faq-title">Good questions.<br/><span>Straight answers.</span></h2><p>Still curious? {contactEmail ? <>Email us at <a className="inline-link" href={`mailto:${contactEmail}`}>{contactEmail}</a>.</> : 'Join the waitlist and we’ll keep you posted.'}</p></div><div className="faq-list">{faqs.map(([q, a], i) => <details key={q} onToggle={e => { if (e.currentTarget.open) trackEvent('faq_expand', { question_id: i }) }}><summary>{q}<Icon name="plus" size={19}/></summary><p>{a}</p></details>)}</div></div></section>
      <section className="closing-banner" aria-label="Join the waitlist"><div className="container"><p><Orb state="listening" size={56} className="closing-orb"/>Good things are out there.</p><button type="button" onClick={() => open('walker', 'footer')}>Let’s walk.<Icon name="arrow" size={36}/></button></div></section>
    </main>
    <footer className="site-footer container"><div className="footer-top"><div><Brand stacked/><p>A little movement. A lot of good.</p>{(contactEmail || socials.length > 0) && <div className="footer-contact">{contactEmail && <a href={`mailto:${contactEmail}`}><Icon name="mail" size={16}/>{contactEmail}</a>}{socials.map(([name, url]) => <a key={name} href={url} rel="noopener noreferrer" target="_blank">{name}</a>)}</div>}</div><nav aria-label="Footer navigation">{links.map(([id, label]) => <a key={id} href={`#${id}`}>{label}</a>)}<button type="button" onClick={() => open('walker', 'footer')}>Join the waitlist</button></nav></div><div className="footer-bottom"><span>© {new Date().getFullYear()} Walkable. Made for the everyday adventure.</span><div><a href="/privacy">Privacy policy</a><a href="/terms">Terms of service</a><a href="/press">Press</a><span className="footer-signoff">See you out there. <Icon name="walk" size={16}/></span></div></div></footer>
    {modal && <Modal track={modal} close={() => setModal(null)}/>}
  </>
}
export default App
