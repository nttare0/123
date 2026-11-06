# DropTV

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

Footer links expose Terms, Privacy, and Cookies/Local Storage notices without requiring the catalog to load. They describe local preferences, the sidebar cookie, Vercel country inference, and direct connections to stream/artwork providers. No analytics or ad trackers were added. The notices are a starting point for the operator to review, not a legal compliance certification; revisit them and consent handling before adding new trackers or changing data practices.

Run `npm test` for country-header validation and cache-safety checks.
