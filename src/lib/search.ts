import { categoryName, countryInfo, isPlayable } from "@/lib/collections"
import { qualityRank } from "@/lib/iptv/merge"
import type { Channel, Meta } from "@/lib/iptv/types"
import { httpsOnly } from "@/stores/settings"

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
  totalSources: number
}

export function buildIndex(channels: Channel[], meta: Meta): CatalogIndex {
  const byId = new Map<string, Channel>()
  const byCountry = new Map<string, Channel[]>()
  const byCategory = new Map<string, Channel[]>()
  const haystack = new Map<string, string>()
  const countryCounts = new Map<string, number>()
  const categoryCounts = new Map<string, number>()
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

    haystack.set(
      channel.id,
      [
        channel.name,
        ...(channel.altNames ?? []),
        channel.network ?? "",
        channel.country,
        countryInfo(channel.country, meta).name,
        channel.categories.map((c) => `${c} ${categoryName(c, meta)}`).join(" "),
      ]
        .join(" ")
        .toLowerCase(),
    )
  }

  return {
    channels,
    byId,
    byCountry,
    byCategory,
    haystack,
    countryCounts,
    categoryCounts,
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

/** Channels with more mirrors, artwork and clean https streams rank higher. */
export function popularity(channel: Channel): number {
  let score = 0
  score += Math.min(channel.sources.length, 6) * 12
  if (channel.logo) score += 10
  score += qualityRank(channel.sources[0]?.quality) * 4
  if (channel.sources.some((s) => s.url.startsWith("https://"))) score += 8
  if (isPlayable(channel)) score += 20
  return score
}

/** Bigger is better; -1 means "no match". */
export function scoreChannel(channel: Channel, query: string, index: CatalogIndex): number {
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
    else if (name.split(/\s+/).some((w) => w.startsWith(q))) score = 700
    else if (hay.includes(q)) score = 520
    else if (q.length >= 3 && isSubsequence(name.replace(/\s+/g, ""), q)) score = 300
  }
  if (score < 0) return -1

  if (channel.id.toLowerCase() === q) score += 400
  return score + popularity(channel) * 0.15
}

/* ------------------------------------------------------------------ */
/* Filtering                                                           */
/* ------------------------------------------------------------------ */

export interface Filters {
  query?: string
  country?: string
  category?: string
  hideHeaderOnly?: boolean
}

/** Can this channel produce at least one source a browser may actually load? */
export function isListable(channel: Channel, hideHeaderOnly: boolean): boolean {
  if (!isPlayable(channel) && hideHeaderOnly) return false
  return channel.sources.some((s) => {
    if (hideHeaderOnly && (s.referrer || s.userAgent)) return false
    if (httpsOnly() && !s.url.startsWith("https://")) return false
    return true
  })
}

export function filterChannels(index: CatalogIndex, filters: Filters): Channel[] {
  const query = filters.query?.trim() ?? ""
  const hideHeaderOnly = filters.hideHeaderOnly ?? true
  const scored: { channel: Channel; score: number }[] = []

  for (const channel of index.channels) {
    if (filters.country && channel.country !== filters.country) continue
    if (filters.category && !channel.categories.includes(filters.category)) continue
    if (!isListable(channel, hideHeaderOnly)) continue

    const score = scoreChannel(channel, query, index)
    if (query && score < 0) continue
    scored.push({ channel, score })
  }

  if (query) {
    scored.sort((a, b) => b.score - a.score || a.channel.name.localeCompare(b.channel.name))
  } else {
    scored.sort((a, b) => a.channel.name.localeCompare(b.channel.name, undefined, { numeric: true }))
  }

  return scored.map((s) => s.channel)
}

/** Fast top-N for the command palette. */
export function searchChannels(index: CatalogIndex, query: string, limit = 8): Channel[] {
  const hits: { channel: Channel; score: number }[] = []
  for (const channel of index.channels) {
    const score = scoreChannel(channel, query, index)
    if (score < 0) continue
    hits.push({ channel, score })
    if (hits.length > limit * 40) break
  }
  hits.sort((a, b) => b.score - a.score)
  return hits.slice(0, limit).map((h) => h.channel)
}
