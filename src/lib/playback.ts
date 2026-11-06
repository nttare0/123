import type { Channel, StreamSource } from "@/lib/iptv/types"
import { httpsOnly } from "@/stores/settings"

/**
 * Which of a channel's sources we are willing to try, and in what order.
 *
 * iptv-org channels often list several mirrors, some geo-blocked, some plain-http,
 * some requiring headers a browser cannot set. We filter, but always relax the
 * rules before giving up entirely — an imperfect stream beats a black screen.
 */
export function selectSources(channel: Channel, hideHeaderOnly: boolean): StreamSource[] {
  const secureOnly = httpsOnly()

  // Only exclude what genuinely cannot play in a browser. Geo-blocked and
  // part-time sources stay in — those labels describe the broadcaster's
  // audience, not a technical impossibility — and are badged in the UI.
  //   level 0: strict · 1: allow http · 2: allow header-restricted
  const passes = (source: StreamSource, level: number) => {
    if (level < 1 && secureOnly && !source.url.startsWith("https://")) return false
    if (level < 2 && hideHeaderOnly && (source.referrer || source.userAgent)) return false
    return true
  }

  for (let level = 0; level <= 2; level++) {
    const kept = channel.sources.filter((source) => passes(source, level))
    if (kept.length) return kept
  }
  return channel.sources
}

/** Human-readable reason a source might not play in a browser. */
export function sourceWarnings(source: StreamSource): string[] {
  const warnings: string[] = []
  if (source.referrer) warnings.push("needs a Referer header")
  if (source.userAgent) warnings.push("needs a custom User-Agent")
  if (!source.url.startsWith("https://")) warnings.push("insecure (http)")
  if (source.labels?.includes("Geo-blocked")) warnings.push("possibly geo-blocked")
  if (source.labels?.includes("Not 24/7")) warnings.push("not broadcasting 24/7")
  return warnings
}
