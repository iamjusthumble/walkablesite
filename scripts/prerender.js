import { readFile, writeFile, mkdir } from 'node:fs/promises'
import { render, faqs } from '../dist-ssr/entry-server.js'
const template = await readFile('dist/index.html', 'utf8')
const pages = { '/': null, '/privacy': 'Privacy policy', '/terms': 'Terms of service', '/press': 'Press & media' }
for (const [path, title] of Object.entries(pages)) {
  let html = template.replace('<div id="root"></div>', `<div id="root">${render(path)}</div>`)
  if (!title) {
    const faqData = { '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: faqs.map(([name, text]) => ({ '@type': 'Question', name, acceptedAnswer: { '@type': 'Answer', text } })) }
    const org = { '@context': 'https://schema.org', '@type': 'Organization', name: 'Walkable', slogan: 'A little movement. A lot of good.', ...(process.env.PUBLIC_ORIGIN && { url: new URL(process.env.PUBLIC_ORIGIN).origin, logo: `${new URL(process.env.PUBLIC_ORIGIN).origin}/images/walkable-logo.png` }) }
    const json = data => JSON.stringify(data).replace(/</g, '\\u003c')
    html = html.replace('</head>', `<script type="application/ld+json">${json(org)}</script>\n<script type="application/ld+json">${json(faqData)}</script>\n</head>`)
  }
  if (title) html = html.replace(/<title>.*?<\/title>/, `<title>${title} — Walkable</title>`).replace('<meta name="description"', '<meta name="robots" content="noindex" />\n    <meta name="description"')
  if (process.env.PUBLIC_ORIGIN) {
    const origin = new URL(process.env.PUBLIC_ORIGIN).origin
    html = html.replace('</head>', `<link rel="canonical" href="${origin}${path}" />\n<meta property="og:url" content="${origin}${path}" />\n<meta property="og:image" content="${origin}/images/social-card.png" />\n<meta name="twitter:image" content="${origin}/images/social-card.png" />\n</head>`)
  }
  const directory = path === '/' ? 'dist' : `dist${path}`
  await mkdir(directory, { recursive: true })
  await writeFile(`${directory}/index.html`, html)
}
if (process.env.PUBLIC_ORIGIN) {
  const origin = new URL(process.env.PUBLIC_ORIGIN).origin
  await writeFile('dist/sitemap.xml', `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"><url><loc>${origin}/</loc></url></urlset>\n`)
  await writeFile('dist/robots.txt', `User-agent: *\nAllow: /\nDisallow: /api/\nSitemap: ${origin}/sitemap.xml\n`)
}
console.log('Pre-rendered home, privacy, terms, and press pages.')
