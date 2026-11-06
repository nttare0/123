export interface SpotlightItem {
  id: string
  title: string
  /** Release year only: the catalog may not provide an exact release date. */
  year?: number
  curated?: boolean
  image: string
  url: string
  description?: string
  kind: "Movie"
}

function imageUrl(value: unknown): string | null {
  if (typeof value !== "string") return null
  try { return new URL(value).protocol === "https:" ? value : null } catch { return null }
}

export function normalizeMovies(data: unknown, now = new Date()): SpotlightItem[] {
  const metas = (data as { metas?: unknown } | null)?.metas
  if (!Array.isArray(metas)) return []
  const seen = new Set<string>()
  return metas.flatMap((movie): SpotlightItem[] => {
    if (!movie || typeof movie !== "object") return []
    const id = movie.imdb_id ?? movie.id
    const year = Number(String(movie.releaseInfo ?? movie.year ?? "").match(/^\d{4}/)?.[0])
    const image = imageUrl(movie.background) ?? imageUrl(movie.poster)
    if (typeof id !== "string" || !/^tt\d+$/.test(id) || seen.has(id) ||
        typeof movie.name !== "string" || !movie.name.trim() || !image ||
        !year || year < now.getUTCFullYear() - 1 || year > now.getUTCFullYear() + 1) return []
    seen.add(id)
    return [{ id, title: movie.name.trim(), year, image, url: `https://www.imdb.com/title/${id}/`,
      description: typeof movie.description === "string" ? movie.description.replace(/<[^>]*>/g, " ").trim() : undefined,
      kind: "Movie" }]
  }).sort((a, b) => (b.year ?? 0) - (a.year ?? 0))
}

let cached: { expires: number; items: SpotlightItem[] } | undefined
let pending: Promise<SpotlightItem[]> | undefined

/** Public Cinemeta metadata only: no key, server, embeds or playback sources. */
export function loadSpotlight(): Promise<SpotlightItem[]> {
  if (cached && cached.expires > Date.now()) return Promise.resolve(cached.items)
  if (pending) return pending
  pending = fetch("https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json", {
    signal: AbortSignal.timeout(12000),
    credentials: "omit",
  }).then(async (response) => {
    if (!response.ok) throw new Error("Movie catalog unavailable")
    const items = normalizeMovies(await response.json())
    if (!items.length) throw new Error("No recent movies available")
    cached = { expires: Date.now() + 30 * 60 * 1000, items }
    return items
  }).finally(() => { pending = undefined })
  return pending
}

/** Bundled original title artwork remains available when the network is offline. */
export const FALLBACK_MOVIES: SpotlightItem[] = [
  ["heart-of-the-beast", "Heart of the Beast"],
  ["resident-evil", "Resident Evil"],
  ["godzilla-minus-zero", "Godzilla Minus Zero"],
  ["wildwood", "Wildwood"],
].map(([slug, title]) => ({
  id: `curated-${slug}`, title, image: `/posters/${slug}.svg`, kind: "Movie", curated: true,
  url: `https://www.imdb.com/find/?q=${encodeURIComponent(title)}`,
  description: "A curated movie pick. Check title details for release and availability information.",
}))
