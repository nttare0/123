import assert from "node:assert/strict"
import { FALLBACK_MOVIES, loadSpotlight, normalizeMovies } from "../src/lib/spotlight.ts"
const year = new Date().getUTCFullYear()
const movie = { id: "tt1234567", name: "Recent movie", releaseInfo: String(year), poster: "https://example.com/poster.jpg", background: "https://example.com/backdrop.jpg" }
const normalized = normalizeMovies({ metas: [movie, movie,
  { ...movie, id: "tt1", releaseInfo: String(year - 5) },
  { ...movie, id: "tt2", poster: "javascript:bad", background: null },
  { ...movie, id: "bad" },
  { ...movie, id: "tt3", releaseInfo: String(year + 1) },
] })
assert.deepEqual(normalized.map((m) => m.id), ["tt3", "tt1234567"])
assert.equal(normalized[1].image, movie.background)
assert.equal(normalized[1].url, "https://www.imdb.com/title/tt1234567/")
assert.deepEqual(normalizeMovies(null), [])
assert.equal(normalizeMovies({ metas: Array.from({ length: 25 }, (_, i) => ({ ...movie, id: `tt${1000 + i}` })) }).length, 25)
assert.deepEqual(FALLBACK_MOVIES.map((m) => m.title), ["Heart of the Beast", "Resident Evil", "Godzilla Minus Zero", "Wildwood"])
for (const item of FALLBACK_MOVIES) {
  assert.ok(item.curated)
  assert.ok(item.image.startsWith("/posters/"))
}
const original = globalThis.fetch
const originalNow = Date.now
let calls = 0
try {
  globalThis.fetch = async () => { calls++; throw new Error("offline") }
  await assert.rejects(loadSpotlight())
  globalThis.fetch = async (url, options) => {
    calls++
    assert.equal(String(url), "https://cinemeta-catalogs.strem.io/top/catalog/movie/top.json")
    assert.equal(options?.credentials, "omit")
    return new Response(JSON.stringify({ metas: [movie] }))
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
