import type { Channel, Meta } from "@/lib/iptv/types"

/** The original Live TV Hub was built around the Great Lakes region — keep that focus. */
export const EAST_AFRICA = ["RW", "UG", "TZ", "KE", "BI", "CD", "SS", "ET", "SO", "ER", "DJ"]

/** Categories worth their own row on the home screen. */
export const HOME_CATEGORIES = ["news", "sports", "music", "movies"]

export function countryInfo(code: string, meta: Meta): { name: string; flag: string } {
  if (code === "INT") return { name: "International", flag: "🌍" }
  const found = meta.countries.find((c) => c.code === code)
  return { name: found?.name ?? code, flag: found?.flag ?? "🏳️" }
}

export function categoryName(id: string, meta: Meta): string {
  return meta.categories.find((c) => c.id === id)?.name ?? id
}

/** A channel is playable when at least one source needs no custom request headers. */
export function isPlayable(channel: Channel): boolean {
  return channel.sources.some((s) => !s.referrer && !s.userAgent)
}
