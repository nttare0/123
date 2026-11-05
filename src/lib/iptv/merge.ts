import type { Catalog, Channel, RawBundle, RawLogo, StreamSource } from "./types"

/**
 * Turns the raw iptv-org API dumps into one flat, player-ready catalog.
 *
 * The same function runs at build time (`npm run data:sync`) and, optionally,
 * in the browser when you press "Sync latest" in Settings — so both paths
 * always produce exactly the same shape.
 */

const QUALITY_RANK: Record<string, number> = {
  "2160p": 8,
  "1440p": 7,
  "1080p": 6,
  "720p": 5,
  "576p": 4,
  "480p": 3,
  "360p": 2,
  "240p": 1,
}

export function qualityRank(quality?: string): number {
  if (!quality) return 0
  return QUALITY_RANK[quality.toLowerCase()] ?? 0
}

/** Only these can be handed to a browser <video> element / hls.js. */
function isPlayableUrl(url: string): boolean {
  try {
    const proto = new URL(url).protocol
    return proto === "http:" || proto === "https:"
  } catch {
    return false
  }
}

function pickLogo(logos: RawLogo[] | undefined): string | undefined {
  if (!logos?.length) return undefined
  const sorted = [...logos].sort((a, b) => {
    // https first: an http logo is blocked as mixed content on an https page
    const aHttps = a.url.startsWith("https:") ? 0 : 1
    const bHttps = b.url.startsWith("https:") ? 0 : 1
    if (aHttps !== bHttps) return aHttps - bHttps
    // then the logo the project actually uses
    if (a.in_use !== b.in_use) return a.in_use ? -1 : 1
    // then the biggest one
    return (b.width ?? 0) - (a.width ?? 0)
  })
  return sorted[0]?.url
}

function scoreSource(s: StreamSource): number {
  let score = 0
  if (!s.referrer && !s.userAgent) score += 1000 // settable from a browser?
  if (s.url.startsWith("https:")) score += 100 // no mixed-content block
  score += qualityRank(s.quality) * 5
  if (!s.labels?.length) score += 3
  if (s.labels?.includes("Not 24/7")) score -= 2
  return score
}

export interface MergeStats {
  channels: number
  sources: number
  countries: number
  skippedNoChannelMeta: number
  skippedBlocked: number
  skippedUnsupportedProtocol: number
  skippedHeadersOnly: number
}

export function mergeCatalog(
  raw: Partial<RawBundle>,
  options: { generatedAt?: string; source?: string; upstream?: string } = {},
): { catalog: Catalog; stats: MergeStats } {
  const channelsById = new Map((raw.channels ?? []).map((c) => [c.id, c]))
  const blocked = new Set(
    (raw.blocklist ?? []).map((b) => b.channel).filter((c): c is string => Boolean(c)),
  )

  // feeds -> languages / broadcast area, per channel
  const languagesByChannel = new Map<string, Set<string>>()
  const areaByChannel = new Map<string, string>()
  for (const feed of raw.feeds ?? []) {
    if (!feed.channel) continue
    if (feed.languages?.length) {
      const set = languagesByChannel.get(feed.channel) ?? new Set<string>()
      for (const l of feed.languages) set.add(l)
      languagesByChannel.set(feed.channel, set)
    }
    if (!areaByChannel.has(feed.channel)) {
      const country = feed.broadcast_area?.find((a) => a.startsWith("c/"))
      if (country) areaByChannel.set(feed.channel, country.slice(2))
    }
  }

  // logos, channel-level first then feed-level
  const logosByChannel = new Map<string, RawLogo[]>()
  for (const logo of raw.logos ?? []) {
    if (!logo.channel || !logo.url) continue
    const list = logosByChannel.get(logo.channel) ?? []
    list.push(logo)
    logosByChannel.set(logo.channel, list)
  }

  const merged = new Map<string, Channel>()
  const stats: MergeStats = {
    channels: 0,
    sources: 0,
    countries: 0,
    skippedNoChannelMeta: 0,
    skippedBlocked: 0,
    skippedUnsupportedProtocol: 0,
    skippedHeadersOnly: 0,
  }
  const seenUrls = new Set<string>()
  const countrySet = new Set<string>()

  for (const stream of raw.streams ?? []) {
    const id = stream.channel
    if (!id) continue // unsorted stream, nothing to attach it to
    if (blocked.has(id)) {
      stats.skippedBlocked++
      continue
    }
    const meta = channelsById.get(id)
    if (meta?.is_nsfw) {
      stats.skippedBlocked++
      continue
    }
    if (!isPlayableUrl(stream.url)) {
      stats.skippedUnsupportedProtocol++
      continue
    }
    const dedupeKey = `${id}|${stream.url}`
    if (seenUrls.has(dedupeKey)) continue
    seenUrls.add(dedupeKey)

    let channel = merged.get(id)
    if (!channel) {
      const country = meta?.country || areaByChannel.get(id) || "INT"
      channel = {
        id,
        name: meta?.name?.trim() || stream.title?.trim() || id,
        country,
        categories: meta?.categories ?? [],
        languages: [...(languagesByChannel.get(id) ?? [])].slice(0, 4),
        sources: [],
      }
      const alt = meta?.alt_names?.filter(Boolean).slice(0, 3)
      if (alt?.length) channel.altNames = alt
      const logo = pickLogo(logosByChannel.get(id))
      if (logo) channel.logo = logo
      if (meta?.website) channel.website = meta.website
      if (meta?.network) channel.network = meta.network
      merged.set(id, channel)
      countrySet.add(country)
      if (!meta) stats.skippedNoChannelMeta++
    }

    const source: StreamSource = { url: stream.url }
    if (stream.quality) source.quality = stream.quality
    if (stream.labels?.length) source.labels = stream.labels
    if (stream.referrer) source.referrer = true
    if (stream.user_agent) source.userAgent = true
    channel.sources.push(source)
  }

  const list = [...merged.values()]
  for (const channel of list) {
    channel.sources.sort((a, b) => scoreSource(b) - scoreSource(a))
    if (channel.sources.every((s) => s.referrer || s.userAgent)) stats.skippedHeadersOnly++
    stats.sources += channel.sources.length
  }
  list.sort((a, b) => a.country.localeCompare(b.country) || a.name.localeCompare(b.name))

  stats.channels = list.length
  stats.countries = countrySet.size

  return {
    catalog: {
      generatedAt: options.generatedAt ?? new Date().toISOString(),
      source: options.source ?? "iptv-org",
      upstream: options.upstream ?? "https://github.com/iptv-org/iptv",
      channels: list,
    },
    stats,
  }
}

export function buildMeta(raw: Partial<RawBundle>, generatedAt?: string) {
  return {
    generatedAt: generatedAt ?? new Date().toISOString(),
    countries: (raw.countries ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    categories: (raw.categories ?? []).slice().sort((a, b) => a.name.localeCompare(b.name)),
    languages: (raw.languages ?? []).slice(),
    regions: (raw.regions ?? []).slice(),
  }
}
