// Clean URLs for the sections of the single-page site. Each path serves the
// same page (pre-rendered with its own title and description) and opens
// scrolled to its section. Shared by the app, the pre-renderer and the sitemap.
export const sections = [
  { id: 'home', path: '/', title: 'Walkable — Your everyday walk. Now with extra good.', description: 'Walkable turns everyday walks into real rewards. Pick a local walking challenge, walk it with live GPS tracking, and redeem a real voucher. Join the early access waitlist, for walkers and local businesses.' },
  { id: 'how-it-works', path: '/how-it-works', label: 'How it works', title: 'How it works — Walkable', description: 'Discover a nearby challenge, walk it with live GPS tracking, earn your reward and redeem it in person. Here’s how Walkable works.' },
  { id: 'features', path: '/features', label: 'Features', title: 'Features — Walkable', description: 'A look inside the Walkable app: weekly progress at a glance, challenges from local brands, GPS-verified walks and a wallet of real vouchers.' },
  { id: 'for-business', path: '/for-business', label: 'For business', title: 'For business — Walkable', description: 'Turn foot traffic into your most loyal customers. Create a walking challenge, pay only for completed visits, and join the free Founding Vendor cohort.' },
  { id: 'waitlist', path: '/waitlist', title: 'Join the waitlist — Walkable', description: 'Join the free Walkable waitlist as a walker or a local business, and be first to know when access opens in your city.' },
  { id: 'faq', path: '/faq', label: 'FAQ', title: 'FAQ — Walkable', description: 'Straight answers about Walkable: what it costs, launch cities, rewards, location data, phones, and how businesses create challenges.' },
]
export const sectionById = Object.fromEntries(sections.map(s => [s.id, s]))
export const sectionByPath = Object.fromEntries(sections.map(s => [s.path, s]))
export const navSections = sections.filter(s => s.label)
