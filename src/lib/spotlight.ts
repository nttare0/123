export interface SpotlightItem {
  id: string
  title: string
  date: string
  image: string | null
  url: string
  description?: string
  kind: "TV" | "Movie"
}

export interface Episode {
  id: number
  airstamp?: string
  airdate?: string
  show?: { id: number; name: string; url: string; summary?: string | null; image?: { medium?: string; original?: string } | null }
  _embedded?: { show?: Episode["show"] }
}

export function normalizeSchedule(data: Episode[], now = new Date()): SpotlightItem[] {
  const seen = new Set<number>()
  return data.filter((e) => e.airstamp && new Date(e.airstamp) >= now)
    .sort((a, b) => (a.airstamp ?? "").localeCompare(b.airstamp ?? ""))
    .flatMap((e) => {
      const show = e.show ?? e._embedded?.show
      if (!show || seen.has(show.id) || !show.url.startsWith("https://www.tvmaze.com/")) return []
      seen.add(show.id)
      return [{ id: `tv-${show.id}`, title: show.name, date: e.airstamp!, description: show.summary?.replace(/<[^>]*>/g, " ").replace(/&amp;/g, "&").replace(/&#39;/g, "’").replace(/&quot;/g, '"').replace(/ /g, " ").replace(/\s+/g, " ").trim(), image: show.image?.original ?? show.image?.medium ?? null, url: show.url, kind: "TV" as const }]
    }).slice(0, 8)
}

let cached: { expires: number; items: SpotlightItem[] } | undefined
let pending: Promise<SpotlightItem[]> | undefined

/** TVmaze supports browser CORS; no server, API key or persistent storage needed. */
export function loadSpotlight(): Promise<SpotlightItem[]> {
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.items)
  if (pending) return pending
  const now = new Date()
  const date = new Date(now.getTime() + 86400000).toISOString().slice(0, 10)
  pending = fetch(`https://api.tvmaze.com/schedule/web?date=${date}`, {
    signal: AbortSignal.timeout(12000),
    credentials: "omit",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Spotlight unavailable")
    const data: unknown = await response.json()
    if (!Array.isArray(data)) throw new Error("Invalid schedule")
    const items = normalizeSchedule(data, now)
    if (!items.length) throw new Error("No upcoming shows")
    cached = { expires: Date.now() + 30 * 60 * 1000, items }
    return items
  }).finally(() => { pending = undefined })
  return pending
}
