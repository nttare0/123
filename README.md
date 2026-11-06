# Live TV Hub

A minimal live-TV browser built with React, [shadcn/ui](https://ui.shadcn.com), Tailwind CSS and [hls.js](https://github.com/video-dev/hls.js). Channel data comes from the community-maintained [iptv-org](https://github.com/iptv-org/iptv) catalog.

## Features

- A bounded home-page grid with local-first recommendations and simple category tabs.
- Automatic country suggestions from the browser time zone, with no location permission or external lookup.
- Search and browse with country and category filters.
- Favourites and watch history, stored locally in your browser.
- Persistent playback with a mini player when navigating away.
- Source selection, automatic mirror failover, quality selection and fullscreen.
- Light/dark themes, a command palette and keyboard/TV-remote navigation.

Settings contain home country (automatic or a manual override), autoplay, automatic failover and whether to hide channels requiring custom request headers. Time-zone detection is approximate: travel, device settings and shared time zones can make it inaccurate. If detection fails, Home shows worldwide picks.

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
