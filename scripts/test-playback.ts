import assert from "node:assert/strict"
import { selectSources } from "../src/lib/playback.ts"
import type { Channel } from "../src/lib/iptv/types.ts"
const channel = { id: "test", name: "Test", country: "RW", categories: [], languages: [], sources: [
  { url: "https://example.com/live.m3u8", labels: ["Geo-blocked", "Not 24/7"], referrer: false, userAgent: false },
  { url: "http://example.com/live.m3u8", labels: [], referrer: false, userAgent: false },
  { url: "https://example.com/headers.m3u8", labels: [], referrer: true, userAgent: false },
] } as Channel
Object.defineProperty(globalThis, "window", { value: { isSecureContext: true }, configurable: true })
assert.equal(selectSources(channel, true).length, 1)
assert.equal(selectSources(channel, false).length, 2)
assert.equal(selectSources({ ...channel, sources: [channel.sources[1]] }, true).length, 0)
Object.defineProperty(globalThis, "window", { value: { isSecureContext: false }, configurable: true })
assert.equal(selectSources(channel, true).length, 2)
console.log("Playback filtering: HTTPS, header settings, geo/part-time sources, no insecure fallback passed.")
