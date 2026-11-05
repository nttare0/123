import {
  categoryName,
  countryInfo,
  isGeoBlocked,
  isPlayable,
  languageName,
} from "@/lib/collections"
import { qualityRank } from "@/lib/iptv/merge"
import type { Channel, Meta } from "@/lib/iptv/types"

/* ------------------------------------------------------------------ */
/* Index                                                               */
/* ------------------------------------------------------------------ */

export interface CatalogIndex {
  channels: Channel[]
  byId: Map<string, Channel>
  byCountry: Map<string, Channel[]>
  byCategory: Map<string, Channel[]>
  haystack: Map<string, string>
  countryCounts: Map<string, number>
  categoryCounts: Map<string, number>
  languageCounts: Map<string, number>
  totalSources: number
}

export function buildIndex(channels: Channel[], meta: Meta): CatalogIndex {
  const byId = new Map<string, Channel>()
  const byCountry = new Map<string, Channel[]>()
  const byCategory = new Map<string, Channel[]>()
  const haystack = new Map<string, string>()
  const countryCounts = new Map<string, number>()
  const categoryCounts = new Map<string, number>()
  const languageCounts = new Map<string, number>()
  let totalSources = 0

  for (const channel of channels) {
    byId.set(channel.id, channel)
    totalSources += channel.sources.length

    const countryList = byCountry.get(channel.country) ?? []
    countryList.push(channel)
    byCountry.set(channel.country, countryList)
    countryCounts.set(channel.country, (countryCounts.get(channel.country) ?? 0) + 1)

    for (const category of channel.categories) {
      const list = byCategory.get(category) ?? []
      list.push(channel)
      byCategory.set(category, list)
      categoryCounts.set(category, (categoryCounts.get(category) ?? 0) + 1)
    }
    for (const language of channel.languages) {
      languageCounts.set(language, (languageCounts.get(language) ?? 0) + 1)
    }

    const parts = [
      channel.name,
      ...(channel.altNames ?? []),
      channel.network ?? "",
      channel.country,
      countryInfo(channel.country, meta).name,
      channel.categories.map((c) => `${c} ${categoryName(c, meta)}`).join(" "),
      channel.languages.map((l) => `${l} ${languageName(l, meta)}`).join(" "),
    ]
    haystack.set(channel.id, parts.join(" ").toLowerCase())
  }

  return {
    channels,
    byId,
    byCountry,
    byCategory,
    haystack,
    countryCounts,
    categoryCounts,
    languageCounts,
    totalSources,
  }
}

/* ------------------------------------------------------------------ */
/* Scoring                                                             */
/* ------------------------------------------------------------------ */

/** Subsequence match ("rtv" inside "rwanda tv") — cheap fuzzy fallback. */
function isSubsequence(text: string, needle: string): boolean {
  let i = 0
  for (const char of text) {
    if (char === needle[i]) i++
    if (i === needle.length) return true
  }
  return false
}

/** Bigger is better; -1 means "no match". */
export function scoreChannel(channel: Channel, query: string, index: CatalogIndex): number {
  if (!query) return popularity(channel)
  const q = query.trim().toLowerCase()
  if (!q) return popularity(channel)

  const name = channel.name.toLowerCase()
  const hay = index.haystack.get(channel.id) ?? name

  let score = -1
  if (name === q) score = 1200
  else if (name.startsWith(q)) score = 1000 - Math.min(name.length - q.length, 40)
  else {
    const at = name.indexOf(q)
    if (at > -1) score = 800 - Math.min(at, 30) * 8
    else {
      const words = name.split(/\s+/)
      if (words.some((w) => w.startsWith(q))) score = 700
      else if (hay.includes(q)) score = 520
      else if (q.length >= 3 && isSubsequence(name.replace(/\s+/g, ""), q)) score = 300
    }
  }
  if (score < 0) return -1

  // Exact-id hits ("RwandaTV.rw") and alt names beat everything but the title.
  if (channel.id.toLowerCase() === q) score += 400
  return score + popularity(channel) * 0.15
}

/** Channels with more sources, a logo and clean https streams rank higher. */
export function popularity(channel: Channel): number {
  let score = 0
  score += Math.min(channel.sources.length, 6) * 12
  if (channel.logo) score += 10
  score += qualityRank(channel.sources[0]?.quality) * 4
  if (channel.sources.some((s) => s.url.startsWith("https://"))) score += 8
  if (!isGeoBlocked(channel)) score += 4
  if (isPlayable(channel)) score += 20
  if (channel.categories.length) score += 3
  return score
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export type SortKey = "relevance" | "name" | "country" | "sources" | "quality"

export interface Filters {
  query?: string
  countries?: string[]
  categories?: string[]
  languages?: string[]
  region?: string
  sort?: SortKey
  protocol?: "https" | "any"
  hideHeaderOnly?: boolean
  hideGeoBlocked?: boolean
  hideNot247?: boolean
  minSources?: number
  ids?: string[] | null
}

export function matchesFilters(channel: Channel, filters: Filters, meta: Meta): boolean {
  if (filters.ids) {
    if (!filters.ids.includes(channel.id)) return false
  }
  if (filters.countries?.length && !filters.countries.includes(channel.country)) return false
  if (filters.categories?.length && !filters.categories.some((c) => channel.categories.includes(c)))
    return false
  if (filters.languages?.length && !filters.languages.some((l) => channel.languages.includes(l)))
    return false
  if (filters.region) {
    const region = meta.regions.find((r) => r.code === filters.region)
    if (region && !region.countries.includes(channel.country)) return false
  }
  if (filters.minSources && channel.sources.length < filters.minSources) return false
  if (!isPlayable(channel) && filters.hideHeaderOnly !== false) return false

  const sources = channel.sources
  const usable = sources.filter((s) => {
    if (filters.hideHeaderOnly !== false && (s.referrer || s.userAgent)) return false
    if (filters.protocol === "https" && !s.url.startsWith("https://")) return false
    if (filters.hideGeoBlocked && s.labels?.includes("Geo-blocked")) return false
    if (filters.hideNot247 && s.labels?.includes("Not 24/7")) return false
    return true
  })
  return usable.length > 0
}

export function filterChannels(
  index: CatalogIndex,
  filters: Filters,
  meta: Meta,
): { channels: Channel[]; total: number } {
  const query = filters.query?.trim() ?? ""
  const scored: { channel: Channel; score: number }[] = []

  for (const channel of index.channels) {
    if (!matchesFilters(channel, filters, meta)) continue
    const score = query ? scoreChannel(channel, query, index) : popularity(channel)
    if (query && score < 0) continue
    scored.push({ channel, score })
  }

  const sort = filters.sort ?? (query ? "relevance" : "name")
  scored.sort((a, b) => {
    switch (sort) {
      case "relevance":
        return b.score - a.score || a.channel.name.localeCompare(b.channel.name)
      case "country":
        return (
          a.channel.country.localeCompare(b.channel.country) ||
          a.channel.name.localeCompare(b.channel.name)
        )
      case "sources":
        return b.channel.sources.length - a.channel.sources.length || b.score - a.score
      case "quality":
        return (
          qualityRank(b.channel.sources[0]?.quality) - qualityRank(a.channel.sources[0]?.quality) ||
          b.score - a.score
        )
      case "name":
      default:
        return a.channel.name.localeCompare(b.channel.name, undefined, { numeric: true })
    }
  })

  return { channels: scored.map((s) => s.channel), total: scored.length }
}

/** Fast top-N used by the command palette (avoids sorting 10k rows). */
export function searchChannels(index: CatalogIndex, query: string, limit = 8): Channel[] {
  const q = query.trim().toLowerCase()
  const hits: { channel: Channel; score: number }[] = []
  for (const channel of index.channels) {
    const score = scoreChannel(channel, q, index)
    if (score < 0) continue
    hits.push({ channel, score })
    if (hits.length > limit * 40) break
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit).map((h) => h.channel)
}
