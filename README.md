# 📺 Live TV Hub

Free-to-air live TV from **181 countries** — **10,411 channels** and **16,496 public stream
sources** — indexed from the community-maintained [iptv-org](https://github.com/iptv-org/iptv)
catalog and played straight in the browser with [hls.js](https://github.com/video-dev/hls.js).

Built with [shadcn/ui](https://ui.shadcn.com), Tailwind CSS v4, React 19 and Vite.

This is a full rewrite of the original single-file `live-tv-hub.txt` (kept in
[`legacy/`](legacy/) for reference), which embedded third-party aggregator iframes and hard-coded
a few dozen channels. Everything below replaces that with real, attributable streams.

---

## Why this is different from the old file

| | `legacy/live-tv-hub.txt` | Live TV Hub 2.0 |
| --- | --- | --- |
| Channels | ~25 hard-coded + 502 blind "DL Stream" slots | 10,411 indexed, searchable, filterable |
| Playback | Third-party iframe embeds (globetv.app, tv247.us, dlstreams.com) | Direct HLS playback in a native `<video>` via hls.js |
| Data | None | iptv-org catalog, re-syncable with one command |
| Failure handling | 5-second spinner, then whatever happened | Per-source timeouts, automatic failover across mirrors, actionable error states |
| Navigation | ▲▼ + Enter on a flat `<div>` list | Spatial D-pad navigation, ⌘K palette, keyboard shortcuts, mouse and touch |
| UI | Inline `<style>`, Arial, one red header | shadcn/ui design system, light + dark themes, responsive down to phones and up to TV |
| Personalisation | None | Favourites, watch history, your own streams — all local |

---

## Features

**Player**

- Persistent `<video>` surface that **morphs between theater and a mini dock** — navigating away
  never interrupts playback, because the element is never re-parented.
- **Automatic source failover.** iptv-org channels often list several mirrors; when one dies the
  player tries the next and tells you what it did.
- Quality selection (from the HLS level list), multi-audio-track selection, playback stats overlay
  (bitrate, resolution, buffer, dropped frames, latency).
- Live-edge handling with a DVR "jump to live" pill when the broadcaster offers a rewind window.
- Fullscreen, picture-in-picture, autoplay-policy recovery ("tap to unmute"), OS media-session
  metadata so headset/lock-screen controls work.
- Honest failure states: geo-blocked, part-time, header-restricted and plain-http sources are
  badged rather than silently broken.

**Discovery**

- Search across names, alternative names (including non-Latin scripts), networks, countries,
  categories and languages, with weighted scoring.
- Filters: country, category, language, region (including curated East/West/Southern/North Africa),
  HD-only, multi-source, protocol policy, sort order. All reflected in the URL, so views are
  shareable and the back button works.
- Home screen rows: continue watching, favourites, your country, East & Great Lakes Africa, and
  each featured category.
- ⌘K / Ctrl+K command palette with channel results, navigation and actions.

**TV-remote first**

- **Spatial navigation**: arrow keys move focus to the visually nearest `data-tv-item` in that
  direction — works across grids, carousels and the sidebar with no index bookkeeping.
- A deliberately loud focus ring (3 px, offset) because it is watched from three metres away.
- `Enter` plays, `Esc` goes back, `PageUp`/`PageDown`/`Home`/`End` behave as expected, and mouse
  users get normal hover/focus styling instead.
- Press `?` anywhere for the full shortcut list.

**Yours**

- Favourites, watch history and **custom streams** (paste any `.m3u8` you have the right to watch)
  are stored in `localStorage` — nothing is uploaded, there is no account.

---

## Getting started

```bash
npm install
npm run dev          # http://localhost:5173
```

```bash
npm run build        # type-check + production bundle in dist/
npm run preview      # serve the production build
npm run typecheck    # tsc -b only
npm run data:sync    # refresh the catalog from iptv-org
```

A catalog snapshot is committed in `public/data/`, so the app works offline and on first clone
without any network access.

---

## The data pipeline

`npm run data:sync` (`scripts/build-data.ts`) pulls the iptv-org datasets and bakes them into two
files:

```
public/data/catalog.json   ~3.9 MB (≈693 kB gzipped)  channels + their stream sources
public/data/meta.json      ~300 kB                    countries, categories, languages, regions
```

It tries three sources in order:

1. `data/raw/*.json` — a local cache from the previous run (gitignored, works offline)
2. **GitHub blob API** — the `gh-pages` branch of [`iptv-org/api`](https://github.com/iptv-org/api),
   which is exactly what the published CDN serves
3. **Published CDN** — `https://iptv-org.github.io/api/*.json`

Force one with `npm run data:sync -- --source=github` (or `api`, `cache`). Set `GITHUB_TOKEN` to
raise the API rate limit.

### How the merge works

`src/lib/iptv/merge.ts` joins `streams` → `channels` → `feeds` → `logos`, then:

- drops non-HTTP protocols (`rtmp`, `srt`, `rtsp`, `mmsh`) — a browser cannot play them
- drops NSFW channels and anything on the iptv-org blocklist (DMCA)
- de-duplicates URLs per channel and **orders sources by viability**: browser-playable first, then
  https, then quality, then fewest warning labels
- picks the best logo per channel (in-use, https, largest) — https matters because an http logo is
  blocked as mixed content on an https page
- carries feed languages and the broadcast country onto each channel

The same function runs in the browser for the optional in-app **Sync latest catalog** action
(Settings → Data), so both paths produce identical data. In dev, `/iptv-api/*` and `/github-api/*`
are proxied to the upstream hosts so that refresh is free of CORS problems.

---

## Keyboard & remote

| Everywhere | |
| --- | --- |
| `Ctrl/⌘ K` or `/` | Search every channel |
| `H` · `B` · `F` | Home · Browse · Favourites |
| `?` | Shortcut reference |

| Player (watch page) | |
| --- | --- |
| `Space` / `K` | Play / pause |
| `M` | Mute |
| `↑` `↓` | Volume |
| `←` `→` | Previous / next channel |
| `N` · `R` | Next source · reload stream |
| `F` · `P` · `S` | Fullscreen · picture-in-picture · stats |

| TV remote | |
| --- | --- |
| `▲▼◀▶` | Move to the nearest channel (spatial) |
| `OK` / `Enter` | Open and play |
| `PgUp` `PgDn` `Home` `End` | Jump a screenful / first / last |
| `Esc` | Back |

---

## Project layout

```
scripts/build-data.ts        catalog sync (GitHub / CDN / cache → public/data)
src/
  lib/
    catalog.tsx              loads the snapshot, builds search indexes, optional live sync
    search.ts                scoring, filtering, sorting
    playback.ts              which sources are viable, and in what order
    collections.ts           categories, regions, channel helpers
    iptv/{types,merge,sync}  upstream shapes, the merge, in-browser refresh
  hooks/
    use-hls.ts               hls.js lifecycle, recovery, levels, audio tracks, stats
    use-tv-remote.ts         spatial D-pad navigation
    use-hotkeys.ts           global shortcuts
    use-paged.ts             progressive rendering for 10k-item lists
  components/
    ui/                      40 shadcn/ui primitives (new-york style, Tailwind v4)
    player/                  persistent video stage, controls, overlays
    channel/                 logo, card, list item, grid, carousel
    app-sidebar · site-header · command-menu · settings-dialog · …
  routes/                    home, browse, watch, favourites, my-streams, not-found
legacy/live-tv-hub.txt       the original single-file app
```

### shadcn/ui notes

`src/components/ui/*` are the genuine [new-york-v4 registry](https://ui.shadcn.com) sources, pulled
from `shadcn-ui/ui@main` and rewired to this project's aliases (`@/components/ui`, `@/lib/utils`,
`@/hooks`), so `npx shadcn@latest add <component>` keeps working — `components.json` is included.

Two deliberate deviations:

- `lib/utils.ts` is written locally (the registry file re-exports from a workspace package).
- `dropdown-menu`, `popover` and `tooltip` accept an extra `container` prop that is forwarded to the
  Radix `Portal`. Portalled content is invisible while an ancestor is in the browser's top layer,
  so the player passes its fullscreen element — otherwise the quality/source menus would vanish in
  fullscreen.

---

## Known limitations (all inherent to browser IPTV)

- **CORS**: playback depends on each broadcaster sending `Access-Control-Allow-Origin`. When one
  does not, the browser refuses the segments. The player surfaces this and fails over.
- **Referer / User-Agent**: forbidden headers in browsers. 580 channels only work with them, so
  they are hidden by default (toggle in Settings) and badged when shown.
- **Mixed content**: plain-http streams cannot play on an https page. The protocol policy defaults
  to *automatic* — hidden on https, shown on http.
- **Geo-blocking**: ~1,000 sources are territory-restricted upstream; they are badged, not hidden,
  because the restriction applies to the broadcaster's audience rather than to this app.
- Streams come and go. Run `npm run data:sync` to refresh.

---

## Credits & licence

Channel data, logos and stream URLs are published by the
[iptv-org](https://github.com/iptv-org/iptv) project and are
[CC0-licensed](https://github.com/iptv-org/database/blob/master/LICENSE). Live TV Hub hosts no
media and is not affiliated with iptv-org or any broadcaster.

UI components © shadcn/ui (MIT). Everything else in this repository is provided as-is for personal
use; check the rights of any stream before redistributing it.
