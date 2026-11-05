import {
  Baby,
  Briefcase,
  Building2,
  Camera,
  Car,
  Church,
  Clapperboard,
  CloudSun,
  CookingPot,
  Drama,
  Film,
  FlaskConical,
  Gamepad2,
  Gavel,
  GraduationCap,
  Heart,
  Landmark,
  Music,
  Newspaper,
  Plane,
  Radio,
  ShoppingBag,
  Smile,
  Sparkles,
  Store,
  Tent,
  Trophy,
  Tv,
  type LucideIcon,
  Users,
  Waves,
} from "lucide-react"

import type { Channel, Meta } from "@/lib/iptv/types"

/* ------------------------------------------------------------------ */
/* Categories                                                          */
/* ------------------------------------------------------------------ */

export const CATEGORY_ICONS: Record<string, LucideIcon> = {
  animation: Sparkles,
  auto: Car,
  business: Briefcase,
  classic: Film,
  comedy: Smile,
  cooking: CookingPot,
  culture: Landmark,
  documentary: Camera,
  education: GraduationCap,
  entertainment: Drama,
  family: Users,
  general: Tv,
  interactive: Gamepad2,
  kids: Baby,
  legislative: Gavel,
  lifestyle: Heart,
  movies: Clapperboard,
  music: Music,
  news: Newspaper,
  outdoor: Tent,
  public: Building2,
  relax: Waves,
  religious: Church,
  science: FlaskConical,
  series: Tv,
  shop: ShoppingBag,
  sports: Trophy,
  travel: Plane,
  weather: CloudSun,
  xxx: Store,
}

export function categoryIcon(id: string): LucideIcon {
  return CATEGORY_ICONS[id] ?? Radio
}

/** Categories worth surfacing as their own row on the home screen. */
export const FEATURED_CATEGORIES = [
  "news",
  "sports",
  "music",
  "movies",
  "kids",
  "entertainment",
  "documentary",
  "religious",
] as const

/* ------------------------------------------------------------------ */
/* Geography                                                           */
/* ------------------------------------------------------------------ */

/** The original Live TV Hub was built around the Great Lakes region — keep that focus. */
export const EAST_AFRICA = ["RW", "UG", "TZ", "KE", "BI", "CD", "SS", "ET", "SO", "ER", "DJ"]
export const SOUTHERN_AFRICA = ["ZA", "ZM", "ZW", "MW", "MZ", "BW", "NA", "AO", "LS", "SZ", "MG", "MU"]
export const WEST_AFRICA = ["NG", "GH", "SN", "CI", "ML", "BF", "GN", "BJ", "TG", "NE", "SL", "LR", "GM"]
export const NORTH_AFRICA = ["EG", "MA", "DZ", "TN", "LY", "SD", "EH"]
export const AFRICA = [...EAST_AFRICA, ...SOUTHERN_AFRICA, ...WEST_AFRICA, ...NORTH_AFRICA]

export const FRENCH_SPEAKING = ["FR", "BE", "CH", "CA", "LU", "SN", "CI", "CM", "ML", "BF", "CD", "MA", "TN", "DZ"]

export function regionOf(country: string, meta: Meta): string | undefined {
  return meta.regions.find((r) => r.countries.includes(country))?.name
}

/* ------------------------------------------------------------------ */
/* Channel helpers                                                     */
/* ------------------------------------------------------------------ */

export function countryInfo(code: string, meta: Meta): { name: string; flag: string } {
  if (code === "INT") return { name: "International", flag: "🌍" }
  if (code === "CUSTOM") return { name: "My streams", flag: "📡" }
  const found = meta.countries.find((c) => c.code === code)
  return { name: found?.name ?? code, flag: found?.flag ?? "🏳️" }
}

export function categoryName(id: string, meta: Meta): string {
  return meta.categories.find((c) => c.id === id)?.name ?? id
}

export function languageName(code: string, meta: Meta): string {
  return meta.languages.find((l) => l.code === code)?.name ?? code.toUpperCase()
}

/** A channel is "browser playable" when at least one source needs no custom headers. */
export function isPlayable(channel: Channel): boolean {
  return channel.sources.some((s) => !s.referrer && !s.userAgent)
}

export function playableSources(channel: Channel): Channel["sources"] {
  return channel.sources.filter((s) => !s.referrer && !s.userAgent)
}

export function bestQuality(channel: Channel): string | undefined {
  return channel.sources.find((s) => s.quality)?.quality
}

export function isGeoBlocked(channel: Channel): boolean {
  return channel.sources.some((s) => s.labels?.includes("Geo-blocked"))
}

export function isNot247(channel: Channel): boolean {
  return channel.sources.some((s) => s.labels?.includes("Not 24/7"))
}

export function hasSecureSource(channel: Channel): boolean {
  return channel.sources.some((s) => s.url.startsWith("https://"))
}
