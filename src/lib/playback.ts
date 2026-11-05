import type { Channel, StreamSource } from "@/lib/iptv/types"
import { resolveProtocol, type SettingsState } from "@/stores/settings"

/**
 * Which of a channel's sources we are actually willing to try, and in which order.
 *
 * iptv-org channels frequently carry several mirrors of the same broadcast, some
 * geo-blocked, some plain-http, some requiring headers a browser cannot set.
 * We filter by the viewer's preferences but always relax the rules before giving
 * up entirely — an "imperfect" stream still beats a black screen.
 */
export function selectSources(channel: Channel, settings: SettingsState): StreamSource[] {
  const httpsOnly = resolveProtocol(settings.protocol) === "https"

  const passes = (source: StreamSource, level: number) => {
    if (level < 4 && settings.hideHeaderOnly && (source.referrer || source.userAgent)) return false
    if (level < 3 && httpsOnly && !source.url.startsWith("https://")) return false
    if (level < 2 && settings.hideGeoBlocked && source.labels?.includes("Geo-blocked")) return false
    if (level < 1 && settings.hideNot247 && source.labels?.includes("Not 24/7")) return false
    return true
  }

  for (let level = 0; level <= 4; level++) {
    const kept = channel.sources.filter((source) => passes(source, level))
    if (kept.length) return kept
  }
  return channel.sources
}

/** Human-readable reason a source might not play in a browser. */
export function sourceWarnings(source: StreamSource): string[] {
  const warnings: string[] = []
  if (source.referrer) warnings.push("Needs a Referer header")
  if (source.userAgent) warnings.push("Needs a custom User-Agent")
  if (!source.url.startsWith("https://")) warnings.push("Insecure (http) stream")
  if (source.labels?.includes("Geo-blocked")) warnings.push("Possibly geo-blocked")
  if (source.labels?.includes("Not 24/7")) warnings.push("Not broadcasting 24/7")
  return warnings
}

export function sourceIsViable(source: StreamSource | undefined | null): boolean {
  return Boolean(source && !source.referrer && !source.userAgent)
}
