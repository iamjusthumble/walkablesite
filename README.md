# Walkable

A responsive marketing and dual-audience waitlist website, built from the Walkable PRD. React 19 + Vite, pre-rendered pages, and a Node SQLite signup API. Existing project dependencies and framework are preserved.

## Run

Requires Node 22.13 or newer (Node 24+ recommended).

```sh
npm install
npm run dev -- --host 127.0.0.1 --port 5188
```

The development and Vite preview servers include the real waitlist API. Signups are stored in `data/waitlist.sqlite`, outside public assets and ignored by Git. No signup data is stored in browser storage.

## Production

```sh
PUBLIC_ORIGIN=https://your-approved-domain.example npm run build
PUBLIC_ORIGIN=https://your-approved-domain.example npm start
```

Set `PORT` if needed (default 4173). Deploy the Node server with `dist/`, `server/`, `package.json`, and a persistent writable volume for `WAITLIST_DB`. Do not deploy only the static bundle if signup capture is required. SQLite is appropriate for a single instance; use a managed database or form service for multi-instance/serverless hosting. Terminate HTTPS at the hosting proxy. Rate limiting uses the socket address and intentionally does not trust arbitrary forwarded headers; configure trusted client-IP handling at the edge before a proxied public launch.

The build pre-renders all pages. Setting `PUBLIC_ORIGIN` also emits canonical links, social-image URLs, and a sitemap. Without a confirmed domain these absolute URLs are deliberately omitted. Legal and press stub pages are noindex until approved content replaces them.

## Section URLs

The site is one page, but each section has a clean URL: `/how-it-works`, `/features`, `/for-business`, `/waitlist` and `/faq`. Opening one loads the page scrolled to that section, with its own title and description (set in `src/sections.js`). Menu clicks scroll smoothly and update the address bar, scrolling keeps the URL on the section in view, Back/Forward work, and old `/#faq`-style links redirect to the clean URL. The build pre-renders each one as `dist/<section>/index.html`, so any host that serves folder `index.html` files (including the included Node server) handles them, and all are listed in the sitemap.

## Waitlist

- Walker: email, optional first name and city.
- Business: business name, contact email, category and city; optional foot traffic.
- Explicit consent text and timestamp saved with each entry.
- Server validation, normalized email deduplication per audience, honeypot, 8 requests per 15 minutes per socket address, 8 KB request limit, and same-origin checks.
- Modal and in-page forms share the same component; inline errors, submission progress, success, duplicate state and copy-link sharing.
- Every new signup (not duplicates or honeypot hits) is emailed to the team at `walkableofficial@gmail.com` (change with `WAITLIST_NOTIFY_EMAIL`). The email lists the lead's details and sets Reply-To to the person who signed up. The lead is saved first, so a failed email never loses a signup.
- To turn the emails on, create `.env` from `.env.example` and set `SMTP_USER=walkableofficial@gmail.com` and `SMTP_PASS` to a Google App Password (Google Account → Security → 2-Step Verification → App passwords). Other SMTP providers work via `SMTP_HOST`/`SMTP_PORT`. Without these the site still works and logs that notifications are off.
- Each new signup also gets a confirmation email: walkers hear they're on the list and will be emailed when access opens in their city; businesses hear you'll reach out to set up their first challenge. Replies go to the team address. Duplicates get no repeat email. Set `PUBLIC_ORIGIN` so the confirmation includes the logo and a share link. Turn confirmations off with `WAITLIST_CONFIRMATION_EMAILS=off`.
- These are one-off confirmations, not campaigns. Choose and connect a marketing email platform, with unsubscribe handling, before sending newsletters or launch announcements.

Export only from a trusted administrator’s terminal (there is no public export endpoint):

```sh
npm run export:waitlist --silent > waitlist.csv
```

CSV values are escaped and spreadsheet formula prefixes neutralized. Keep exports private. Back up the SQLite database on the hosting platform; database/export retention is an owner policy decision.

## Optional settings

- `MOMENTUM_MIN`: shows the honest "momentum" section (PRD 9.5) once total signups reach this number. Counts are rounded down; unset or `0` keeps it hidden. Served from `GET /api/waitlist/stats`.
- `VITE_CONTACT_EMAIL`: footer and FAQ contact email, set at build time and hidden until set.
- Social accounts (Instagram, TikTok, YouTube, Facebook, LinkedIn) are in `src/socials.js`, shown as icon links in the footer and listed as `sameAs` in the structured data.
- Testimonials: add approved quotes to the `testimonials` list in `src/App.jsx`. While it's empty, the section stays hidden.

## Verification

```sh
npm test
npm run build
```

Tests cover persistence across reopening, case-insensitive duplicate detection, separate audience segmentation, required fields, consent, malformed payloads, honeypot handling, origin checks, method restrictions, request size, and rate limiting.

## Brand and source assets

Brand colors: `#8C52FF`, `#2E1065`, `#C9A6FF`, `#EFE6FD`. Fonts: Bricolage Grotesque and Instrument Sans. App images in `public/images/` (PNG plus WebP) are extracted and resized from the supplied PRD, including the Profile screen that shows the existing Vendor Profile entry point. The live-tracking visual is a labeled illustration until a real-device capture is available. They are explicitly identified as sample app data; brand names in these screenshots do not claim a confirmed partnership. No testimonials, partner logos, or waitlist counts have been invented.

## Third-party assets

- Animated dot orbs (`src/orbs.js`) are ported from [thinking-orbs](https://github.com/RareFormLabs/thinking-orbs), MIT © 2026 Jakub Antalik, recoloured to the Walkable palette. They pause offscreen and in hidden tabs, and show a still frame when reduced motion is on.
- People photos in `public/images/people/` are from Unsplash under the free [Unsplash License](https://unsplash.com/license) (no Unsplash+ images): [discover](https://unsplash.com/photos/58xYWBSr0aQ), [walk](https://unsplash.com/photos/OY-zZ9qDwPQ), [earn](https://unsplash.com/photos/cvqvLMVEfBY), [redeem](https://unsplash.com/photos/4g_M9D0rn8M), [business](https://unsplash.com/photos/fdUwaeewqt8), [community](https://unsplash.com/photos/0w8_lBRYWuA). Swap these for your own launch-city photography when it's available.

## Launch inputs still needed

1. Approved privacy policy and terms (current pages are clearly labeled stubs).
2. Confirmed public domain and hosting target with durable storage.
3. Chosen email platform with working unsubscribe before any campaigns begin.
4. Approved contact email; none has been guessed. Social accounts are set in `src/socials.js`.
5. Real-device live tracking screenshot and approved final product captures (the site no longer names a platform; iOS and Android are both described as coming). Current genuine PRD screenshots are suitable for review, not a representation of live reward availability.
6. Confirmed launch cities, launch timing, app pricing, and vendor pricing if these should be disclosed. Current copy avoids unconfirmed promises.
7. Optional analytics: events are emitted as `walkable:analytics` CustomEvents and forwarded to `window.plausible` when configured. No external analytics tracker is installed, and no email/name is included in events. Test provider ingestion after enabling it.
8. Run Lighthouse and cross-browser accessibility/performance QA on the final HTTPS deployment; no unmeasured scores are claimed.

The vendor dashboard, mobile app changes, payments, and a CMS are intentionally outside this website.
