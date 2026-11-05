/**
 * Shapes published by the iptv-org API
 * (https://iptv-org.github.io/api/ — generated from the `iptv-org/database`,
 * `iptv-org/iptv` and `iptv-org/api` repositories).
 */

export interface RawChannel {
  id: string
  name: string
  alt_names: string[]
  network: string | null
  owners: string[]
  country: string
  categories: string[]
  is_nsfw: boolean
  launched: string | null
  closed: string | null
  replaced_by: string | null
  website: string | null
}

export interface RawFeed {
  channel: string
  id: string | null
  name: string | null
  alt_names: string[]
  is_main: boolean
  broadcast_area: string[]
  timezones: string[]
  languages: string[]
  format: string | null
}

export interface RawStream {
  channel: string | null
  feed: string | null
  title: string | null
  url: string
  quality: string | null
  labels: string[]
  user_agent: string | null
  referrer: string | null
}

export interface RawLogo {
  channel: string | null
  feed: string | null
  in_use: boolean
  tags: string[]
  width: number | null
  height: number | null
  format: string | null
  url: string
}

export interface RawCountry {
  name: string
  code: string
  languages: string[]
  flag: string
}

export interface RawCategory {
  id: string
  name: string
  description: string | null
}

export interface RawLanguage {
  code: string
  name: string
}

export interface RawRegion {
  code: string
  name: string
  countries: string[]
}

export interface RawBlocklistEntry {
  channel: string | null
  feed: string | null
  url: string | null
  reason: string
  ref: string | null
}

export interface RawBundle {
  channels: RawChannel[]
  feeds: RawFeed[]
  streams: RawStream[]
  logos: RawLogo[]
  countries: RawCountry[]
  categories: RawCategory[]
  languages: RawLanguage[]
  regions: RawRegion[]
  blocklist: RawBlocklistEntry[]
}

/* ------------------------------------------------------------------ */
/* Shapes this app actually consumes (produced by `mergeCatalog`)      */
/* ------------------------------------------------------------------ */

export type StreamLabel = "Geo-blocked" | "Not 24/7" | string

export interface StreamSource {
  /** Playlist URL (.m3u8 or, rarely, a direct broadcast) */
  url: string
  /** Maximum advertised quality, e.g. "1080p" */
  quality?: string
  /** "Geo-blocked" / "Not 24/7" — reasons a stream may fail for some viewers */
  labels?: StreamLabel[]
  /** Stream only works with a custom Referer header (impossible from a browser) */
  referrer?: boolean
  /** Stream only works with a custom User-Agent header (impossible from a browser) */
  userAgent?: boolean
}

export interface Channel {
  id: string
  name: string
  altNames?: string[]
  /** ISO 3166-1 alpha-2, or "INT" for channels with no country of origin */
  country: string
  categories: string[]
  /** ISO 639-2/B three-letter codes, taken from the channel feeds */
  languages: string[]
  logo?: string
  website?: string
  network?: string
  sources: StreamSource[]
}

export interface Catalog {
  generatedAt: string
  source: string
  upstream: string
  channels: Channel[]
}

export interface Meta {
  generatedAt: string
  countries: RawCountry[]
  categories: RawCategory[]
  languages: RawLanguage[]
  regions: RawRegion[]
}
