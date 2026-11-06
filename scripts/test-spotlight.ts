import assert from "node:assert/strict"
import { loadSpotlight, normalizeSchedule } from "../src/lib/spotlight.ts"
const show = { id: 1, name: "Upcoming show", url: "https://www.tvmaze.com/shows/1/test", image: null }
assert.deepEqual(normalizeSchedule([
  { id: 1, airstamp: "2026-11-07T12:00:00Z", show },
  { id: 2, airstamp: "2026-11-07T13:00:00Z", _embedded: { show } },
  { id: 3, airstamp: "2026-11-01T12:00:00Z", show: { ...show, id: 2 } },
  { id: 4, airstamp: "2026-11-07T14:00:00Z", show: { ...show, id: 3, url: "javascript:bad" } },
], new Date("2026-11-06T12:00:00Z")).map((i) => i.id), ["tv-1"])
const original = globalThis.fetch
const originalNow = Date.now
let calls = 0
try {
  globalThis.fetch = async () => { calls++; throw new Error("offline") }
  await assert.rejects(loadSpotlight())
  globalThis.fetch = async (url, options) => {
    calls++
    assert.match(String(url), /^https:\/\/api.tvmaze.com\/schedule\/web\?date=/)
    assert.equal(options?.credentials, "omit")
    return new Response(JSON.stringify([{ id: 1, airstamp: new Date(originalNow() + 86400000).toISOString(), show }]))
  }
  const [first, second] = await Promise.all([loadSpotlight(), loadSpotlight()])
  assert.equal(first.length, 1)
  assert.equal(first, second)
  assert.equal(calls, 2)
  await loadSpotlight()
  assert.equal(calls, 2)
  Date.now = () => originalNow() + 31 * 60 * 1000
  await loadSpotlight()
  assert.equal(calls, 3)
} finally {
  globalThis.fetch = original
  Date.now = originalNow
}
console.log("Spotlight: filtering, deduplication, safe URLs, retry, shared requests and cache expiry passed.")
