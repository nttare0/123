# Zepvi

A minimal live-TV browser built with React, [shadcn/ui](https://ui.shadcn.com), Tailwind CSS and [hls.js](https://github.com/video-dev/hls.js). Channel data comes from the community-maintained [iptv-org](https://github.com/iptv-org/iptv) catalog.

## Features

- A bounded home-page grid with local-first recommendations and simple category tabs.
- Automatic IP-country suggestions through Vercel, with no GPS prompt or separate lookup provider.
- Search and browse with country and category filters.
- Favourites and watch history, stored locally in your browser.
- Persistent playback with a mini player when navigating away.
- Source selection, automatic mirror failover, quality selection and fullscreen.
- Light/dark themes, a command palette and keyboard/TV-remote navigation.

Settings contain home country (automatic or a manual override), autoplay, automatic failover and whether to hide channels requiring custom request headers. Network detection is approximate: VPNs, proxies and mobile networks can make it inaccurate. If detection fails, Home shows worldwide picks.

## Run locally

Use a current Node.js LTS release.

```sh
npm ci
npm run dev
```

Open the Vite URL shown in the terminal. A catalog snapshot is included in `public/data/`; no API key or backend is needed.

```sh
npm run typecheck
npm run build
npm run preview
```

For static hosting, deploy `dist/` and configure unknown application paths to serve `index.html`.

## Update the catalog

```sh
npm run data:sync
```

The script merges iptv-org datasets into `public/data/catalog.json` and `public/data/meta.json`. It tries the local cache first, then GitHub and the published API. Raw cached datasets live in `data/raw/` and are ignored by Git. To bypass the cache:

```sh
npm run data:sync -- --source=github
```

Review and commit the generated snapshot when updating it. Catalog updates are intentionally not part of the app's interface.

## Controls

- **Ctrl/⌘ K** or **/**: open the command palette.
- **Space / K**: play or pause on a channel page.
- **M**: mute; **F**: fullscreen; **R**: retry playback.
- **Arrow keys**: navigate channel cards; on the player page, adjust volume or switch queued channels when a card is not focused.

## Playback limitations

The app does not host or proxy video. Broadcasters may block browser access, restrict streams by location, broadcast part-time or stop serving a URL. HTTPS pages cannot load insecure HTTP video, and browsers cannot freely set custom Referer or User-Agent headers. Availability is not guaranteed.

The original single-file implementation is preserved in `legacy/live-tv-hub.txt` for reference.

## Vercel deployment and country detection

Production URL: https://droptv.vercel.app/ · Contact: nttare0@gmail.com.

Import this repository into Vercel. `vercel.json` configures the build and SPA routes. Deploy both `dist/` and the `api/country.ts` function through Vercel, rather than uploading only the static build. The endpoint reads Vercel’s `x-vercel-ip-country` header and returns only a country code with private/no-store caching. No IP is returned to the browser or stored by this function. Vercel may independently process network logs. Do not expose this handler behind a host that blindly trusts client-provided country headers.

`npm run dev` serves the frontend only; country lookup is unavailable there and safely falls back to worldwide picks. Use Vercel deployment/preview to verify real visitor country headers. Manual country selection always wins. The app no longer guesses from the time zone. Use Automatic in Settings to clear an old manual selection.

## Google Search Console

1. Deploy, then check `/robots.txt`, `/sitemap.xml`, `/terms.html`, `/privacy.html`, and `/cookies.html` at the production URL.
2. In Search Console, add a **URL-prefix** property for `https://droptv.vercel.app/`. (DNS verification of the shared `vercel.app` parent domain is not under your control.)
3. Choose HTML-tag verification, copy only the token from its `content` attribute into the Vercel environment variable `VITE_GOOGLE_SITE_VERIFICATION`, and redeploy. The build injects the verification tag. Alternatively, place Google's provided HTML verification file in `public/` and redeploy.
4. Verify ownership, then submit `https://droptv.vercel.app/sitemap.xml`. Use URL Inspection to request indexing of the homepage and Browse.

Homepage and Browse have canonical URLs and metadata, including pre-JavaScript Browse metadata. Legal pages are complete static HTML. Personal favourites and watch pages are intentionally excluded from the sitemap and marked noindex; filtered Browse pages are canonicalized to Browse and marked noindex by the app. The channel application still relies on JavaScript rendering—this is not full channel-page SSR. Google indexing is not guaranteed. A Search Console account has not been connected or verified automatically.

## Privacy and legal notices

Footer links expose Terms, Privacy, and Cookies/Local Storage notices without requiring the catalog to load. They describe local preferences, the sidebar cookie, Vercel country inference, and direct connections to stream/artwork providers. Vercel Web Analytics is included; no ad trackers were added. The notices are a starting point for the operator to review, not a legal compliance certification; revisit them and consent handling before adding new trackers or changing data practices.

Run `npm test` for country-header validation and cache-safety checks.

## Spotlight, sharing and 404s

Home features one recent movie at a time using the public Cinemeta top-movie metadata catalog, fetched directly in the browser without an API key or server. It prefers landscape background art, falls back to posters, and shows all eligible titles returned by the catalog from last year through next year, newest year first. The catalog is a fresh popular-title feed, **not a complete or exact latest-release calendar**. A year is shown rather than inventing a release date. Titles link to IMDb details, not playback.

Results are validated, deduplicated, and cached in memory for 30 minutes, with shared requests and retry after errors. Provider failure retains the last successful catalog or uses bundled, clearly labeled curated title artwork for Heart of the Beast, Resident Evil, Godzilla Minus Zero and Wildwood. These are original typographic graphics, not official posters or verified latest-release metadata. Requests omit credentials but expose the visitor's network information to Cinemeta and image providers. TMDB is not used because its API requires a credential; no borrowed or embedded key is supplied. Provider access/CORS and imagery availability still need verification in a real browser; this sandbox's host allowlist prevents a live Cinemeta request. Tests use fixtures and mocked responses.

Social crawlers receive Open Graph and Twitter large-image tags directly in HTML, with an absolute 1200×630 PNG (`/social-card.png`) and brief text. Browse gets its own static title. Watch URLs currently share the site-wide card; per-channel crawler metadata would require prerendering or server rendering. Some social networks cache previews and may require their sharing debugger to refresh after deployment.

Unknown client routes display the redesigned React 404 without waiting for catalog loading. Vercel's native not-found handling serves `public/404.html` with HTTP 404 for unknown direct URLs; there is intentionally no catch-all rewrite that turns missing URLs into HTTP 200. Verify status and appearance on deployment. `npm test` includes Spotlight date/deduplication and failure-state tests.

## UI defaults and release checks

Navigation is hidden initially and automatically closes on route changes or selection. The header menu toggles it on desktop and mobile; opening it does not trigger the route-close effect. Theme defaults to the device setting, including OS changes; the header button cycles system → light → dark → system. A previously saved explicit theme remains respected.

Playback tests cover secure-source filtering and header restrictions. HTTPS pages no longer fall back to insecure HTTP streams that browsers would block. Unit tests and build checks do not guarantee broadcaster availability or substitute for real-browser HLS, native Safari, fullscreen, mobile and TV-remote testing. Search Console files are prepared, but production deployment, ownership verification, URL Inspection and sitemap submission still require the site owner.

The production HTML now includes the site owner’s Google Search Console verification token directly. The optional build-time environment token is only injected when no static verification tag is present, preventing duplicates. Deploy before attempting ownership verification.

## Brand and deployment address

The app is now branded **Zepvi**. Its existing deployment URL remains `https://droptv.vercel.app/`; changing a display name does not reserve or rename a Vercel domain. Keep this address in canonical links, sitemap, robots, structured data and social-image URLs until a replacement domain has been configured and verified. Then update all those URLs together and review Search Console ownership/redirects. Existing `live-tv-hub:*` storage keys intentionally remain unchanged so favourites and settings survive the rebrand. Name selection is not trademark clearance or a domain-availability guarantee.

## Vercel Web Analytics

`@vercel/analytics/react` is mounted once at the application root (this is Vite, not Next.js). Enable Web Analytics for the project in the Vercel dashboard and redeploy; the production deployment provides the `/_vercel/insights` script/endpoint. Local development does not prove production ingestion. The integration strips query strings and fragments from analytics URLs and sends no custom events. Privacy and cookies notices disclose the cookieless analytics integration. Review regional consent requirements before launch.

Poster rotation advances every five seconds, pauses while hovered/focused or the tab is hidden, and has an explicit pause/resume button. The full eligible response is used without an eight-item cap; this does not mean the provider supplies every movie or infinite pagination. A 30-minute refresh picks up feed changes. Only the displayed artwork is mounted, avoiding downloading every full-resolution image at once.
