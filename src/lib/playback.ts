import type { Channel, StreamSource } from "@/lib/iptv/types"
import { httpsOnly } from "@/stores/settings"

/** Keep only sources allowed by browser transport and the user's header filter. */
export function selectSources(channel: Channel, hideHeaderOnly: boolean): StreamSource[] {
  return channel.sources.filter((source) => {
    if (httpsOnly() && !source.url.startsWith("https://")) return false
    if (hideHeaderOnly && (source.referrer || source.userAgent)) return false
    return true
  })
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
