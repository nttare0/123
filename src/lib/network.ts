/**
 * Rough connection-speed assessment used to gate automatic source failover.
 *
 * The idea: when a channel will not play, decide whether the fault is the
 * stream source or the viewer's own link. If the connection is healthy and the
 * stream still fails, switching to another source is worth it; if the
 * connection itself is struggling, churning through every mirror just makes
 * things worse.
 */

export type ConnectionQuality = "good" | "poor" | "unknown"

export interface ConnectionEstimate {
  quality: ConnectionQuality
  /** Measured (or reported) download throughput in Mb/s, when available. */
  mbps: number | null
}

/** Live TV needs roughly this much downstream to play smoothly. */
const GOOD_MBPS = 2
/** Below this the viewer's own link is almost certainly the bottleneck. */
const POOR_MBPS = 1.2
/** How long the throughput probe may run before it is cut short. */
const PROBE_MS = 2_500
/** Avoid re-probing the network during a burst of failures. */
const CACHE_MS = 30_000

interface NetworkInformationLike {
  downlink?: number
  effectiveType?: string
  rtt?: number
}

function networkInformation(): NetworkInformationLike | null {
  const nav = navigator as Navigator & { connection?: NetworkInformationLike }
  return nav.connection ?? null
}

function fromMbps(mbps: number | null): ConnectionEstimate {
  if (mbps == null) return { quality: "unknown", mbps: null }
  if (mbps >= GOOD_MBPS) return { quality: "good", mbps }
  if (mbps < POOR_MBPS) return { quality: "poor", mbps }
  return { quality: "unknown", mbps }
}

/**
 * Timed download of a same-origin asset (~300 kB) to measure real throughput.
 * Returns Mb/s, or null when the probe itself could not run.
 */
async function probeThroughput(): Promise<number | null> {
  const started = performance.now()
  const controller = new AbortController()
  const hardStop = window.setTimeout(() => controller.abort(), PROBE_MS + 500)
  let bytes = 0
  try {
    const response = await fetch(`/data/meta.json?nc=${Date.now()}`, {
      cache: "no-store",
      signal: controller.signal,
    })
    if (!response.ok) return null
    const reader = response.body?.getReader()
    if (!reader) return null
    for (;;) {
      const chunk = await reader.read()
      if (chunk.done) break
      bytes += chunk.value.byteLength
      if (performance.now() - started >= PROBE_MS) {
        controller.abort()
        break
      }
    }
  } catch {
    // An abort after our own cutoff still leaves usable bytes behind.
    if (bytes === 0) return 0
  } finally {
    window.clearTimeout(hardStop)
  }
  const seconds = (performance.now() - started) / 1000
  if (seconds <= 0 || bytes === 0) return 0
  return (bytes * 8) / 1_000_000 / seconds
}

let cache: { estimate: ConnectionEstimate; at: number } | null = null

/** Estimate the viewer's connection quality, cached briefly to avoid churn. */
export async function assessConnection(): Promise<ConnectionEstimate> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.estimate

  let estimate: ConnectionEstimate = { quality: "unknown", mbps: null }

  const info = networkInformation()
  if (info && typeof info.downlink === "number") {
    const reported = fromMbps(info.downlink)
    if (info.effectiveType === "slow-2g" || info.effectiveType === "2g") {
      estimate = { quality: "poor", mbps: info.downlink }
    } else if (reported.quality !== "unknown") {
      estimate = reported
    }
  }

  if (estimate.quality === "unknown") {
    // Ambiguous or unavailable signal — measure a real download instead.
    estimate = fromMbps(await probeThroughput())
  }

  cache = { estimate, at: Date.now() }
  return estimate
}
