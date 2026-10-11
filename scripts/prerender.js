import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { render, faqs } from '../dist-ssr/entry-server.js'
import { sections } from '../src/sections.js'
import { socials } from '../src/socials.js'
const template = await readFile('dist/index.html', 'utf8')
const origin = process.env.PUBLIC_ORIGIN ? new URL(process.env.PUBLIC_ORIGIN).origin : ''
const attr = value => value.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')
const json = data => JSON.stringify(data).replace(/</g, '\\u003c')
// Every section URL (/, /how-it-works, /faq, …) is the same page with its own title and description.
const pages = [
  ...sections.map(s => ({ path: s.path, title: s.title, description: s.description, index: true })),
  ...[['/privacy', 'Privacy policy'], ['/terms', 'Terms of service'], ['/press', 'Press & media']].map(([path, title]) => ({ path, title: `${title} — Walkable`, index: false })),
]
for (const page of pages) {
  let html = template.replace('<div id="root"></div>', `<div id="root">${render(page.path)}</div>`)
    .replace(/<title>.*?<\/title>/, `<title>${page.title}</title>`)
  if (page.description) {
    html = html.replace(/(<meta name="description" content=")[^"]*/, `$1${attr(page.description)}`)
      .replace(/(<meta name="twitter:description" content=")[^"]*/, `$1${attr(page.description)}`)
      .replace(/(<meta property="og:description" content=")[^"]*/, `$1${attr(page.description)}`)
  }
  if (page.index) {
    if (page.path !== '/') html = html.replace(/(<meta property="og:title" content=")[^"]*/, `$1${attr(page.title)}`).replace(/(<meta name="twitter:title" content=")[^"]*/, `$1${attr(page.title)}`)
    const faqData = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }
    const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Walkable', slogan: 'A little movement. A lot of good.', sameAs: socials.map(s => s.url), ...(origin && { url: origin, logo: `${origin}/images/walkable-logo.png` }) }
    const structured = [org, ...(page.path === '/' || page.path === '/faq' ? [faqData] : [])]
    html = html.replace('</head>', `${structured.map(d => `<script type="application/ld+json">${json(d)}</script>`).join('\n')}\n</head>`)
  } else {
    html = html.replace('<meta name="description"', '<meta name="robots" content="noindex" />\n    <meta name="description"')
  }
  if (origin) html = html.replace('</head>', `<link rel="canonical" href="${origin}${page.path}" />\n<meta property="og:url" content="${origin}${page.path}" />\n<meta property="og:image" content="${origin}/images/social-card.png" />\n<meta name="twitter:image" content="${origin}/images/social-card.png" />\n</head>`)
  const directory = page.path === '/' ? 'dist' : `dist${page.path}`
  await mkdir(directory, { recursive: true })
  await writeFile(`${directory}/index.html`, html)
}
if (origin) {
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${sections.map(s => `<url><loc>${origin}${s.path}</loc></url>`).join('')}</urlset>\n`)
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`)
}
console.log(`Pre-rendered ${pages.map(p => p.path).join(', ')}.`)
