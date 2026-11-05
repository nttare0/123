/** Small formatting helpers shared across the app. */

export function compactNumber(value: number): string {
  if (value < 1000) return String(value)
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: value < 10_000 ? 1 : 0,
  }).format(value)
}

export function formatDate(iso: string, withTime = false): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return "—"
  return new Intl.DateTimeFormat("en-GB", {
    day: "numeric",
    month: "short",
    year: "numeric",
    ...(withTime ? { hour: "2-digit", minute: "2-digit" } : {}),
  }).format(date)
}

export function timeAgo(input: string | number): string {
  const then = typeof input === "number" ? input : new Date(input).getTime()
  const seconds = Math.round((Date.now() - then) / 1000)
  if (seconds < 45) return "just now"
  const units: [Intl.RelativeTimeFormatUnit, number][] = [
    ["minute", 60],
    ["hour", 3600],
    ["day", 86_400],
    ["week", 604_800],
    ["month", 2_592_000],
    ["year", 31_536_000],
  ]
  const rtf = new Intl.RelativeTimeFormat("en", { numeric: "auto" })
  let divisor = 1
  let unit: Intl.RelativeTimeFormatUnit = "minute"
  for (const [u, d] of units) {
    if (Math.abs(seconds) >= d) {
      unit = u
      divisor = d
    }
  }
  return rtf.format(-Math.round(seconds / divisor), unit)
}

/** Two-letter monogram used when a channel has no (loadable) logo. */
export function monogram(name: string): string {
  const cleaned = name.replace(/[^\p{L}\p{N} ]/gu, " ").trim()
  if (!cleaned) return "TV"
  const words = cleaned.split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  return (words[0][0] + words[1][0]).toUpperCase()
}

export function pluralize(count: number, singular: string, plural = `${singular}s`): string {
  return `${count.toLocaleString()} ${count === 1 ? singular : plural}`
}

/** Deterministic hue from a string, used for logo placeholder tiles. */
export function hueFromString(value: string): number {
  let hash = 0
  for (let i = 0; i < value.length; i++) hash = (hash * 31 + value.charCodeAt(i)) >>> 0
  return hash % 360
}

export function isSecurePage(): boolean {
  return typeof window !== "undefined" && window.isSecureContext
}

/** Normalise a quality string ("1080p", "HD", null) to something badge-worthy. */
export function qualityLabel(quality?: string): string | null {
  if (!quality) return null
  const q = quality.toLowerCase()
  if (q.includes("2160") || q.includes("4k")) return "4K"
  if (q.includes("1440")) return "1440p"
  if (q.includes("1080")) return "1080p"
  if (q.includes("720")) return "720p"
  if (q.includes("576")) return "576p"
  if (q.includes("480")) return "480p"
  if (q.includes("360")) return "360p"
  if (q.includes("hd")) return "HD"
  if (q.includes("sd")) return "SD"
  return quality
}

export function hostnameOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "")
  } catch {
    return url
  }
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
}
