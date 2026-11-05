import { mergeCatalog } from "./merge"
import type { Catalog, Meta, RawBundle } from "./types"

/**
 * Optional in-browser refresh of the catalog.
 *
 * Requests go through same-origin proxies declared in `vite.config.ts` so the
 * browser never has to care about CORS:
 *
 *   /iptv-api/*    → https://iptv-org.github.io/api/*   (the published CDN)
 *   /github-api/*  → https://api.github.com/*           (works from sandboxes
 *                                                        that cannot reach the CDN)
 *
 * The bundled snapshot in `public/data/` is always the fallback — run
 * `npm run data:sync` to bake in a newer one.
 */

export interface SyncProgress {
  source: string
  file: string
  index: number
  count: number
  ratio: number
}

interface SyncSource {
  id: string
  label: string
  fetch: (file: string, onProgress: (ratio: number) => void) => Promise<unknown[]>
}

const HEAVY_FILES = ["channels", "streams", "logos", "blocklist"] as const

async function fetchText(url: string, onProgress: (ratio: number) => void): Promise<string> {
  const res = await fetch(url, {
    headers: { accept: "application/vnd.github+json;q=1.0, application/json;q=0.9" },
  })
  if (!res.ok) throw new Error(`${url} responded with HTTP ${res.status}`)

  const total = Number(res.headers.get("content-length") ?? 0)
  if (!res.body || !total) {
    const text = await res.text()
    onProgress(1)
    return text
  }

  const reader = res.body.getReader()
  const decoder = new TextDecoder()
  let text = ""
  let received = 0
  for (;;) {
    const { done, value } = await reader.read()
    if (done) break
    if (!value) continue
    received += value.byteLength
    text += decoder.decode(value, { stream: true })
    onProgress(Math.min(1, received / total))
  }
  text += decoder.decode()
  onProgress(1)
  return text
}

function base64ToText(base64: string): string {
  const binary = atob(base64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i)
  return new TextDecoder().decode(bytes)
}

const cdnSource: SyncSource = {
  id: "cdn",
  label: "iptv-org.github.io/api",
  fetch: async (file, onProgress) =>
    JSON.parse(await fetchText(`/iptv-api/${file}.json`, onProgress)) as unknown[],
}

const githubSource: SyncSource = {
  id: "github",
  label: "github.com/iptv-org/api",
  fetch: async (file, onProgress) => {
    const tree = JSON.parse(
      await fetchText(
        "/github-api/repos/iptv-org/api/git/trees/gh-pages?recursive=1",
        () => undefined,
      ),
    ) as { tree: { path: string; sha: string }[] }
    const entry = tree.tree.find((t) => t.path === `${file}.json`)
    if (!entry) throw new Error(`${file}.json is missing from iptv-org/api@gh-pages`)
    const blob = JSON.parse(
      await fetchText(`/github-api/repos/iptv-org/api/git/blobs/${entry.sha}`, onProgress),
    ) as { content: string }
    return JSON.parse(base64ToText(blob.content)) as unknown[]
  },
}

const SOURCES: SyncSource[] = [cdnSource, githubSource]

export interface SyncResult {
  catalog: Catalog
  meta: Meta
  source: string
}

/**
 * Re-downloads the upstream datasets and rebuilds the catalog in the browser.
 * `previous` is used to keep metadata that is expensive to re-download
 * (feed languages, country/category lookups).
 */
export async function syncCatalog(
  previous: { catalog: Catalog; meta: Meta },
  onProgress?: (progress: SyncProgress) => void,
): Promise<SyncResult> {
  let lastError: Error | null = null

  for (const source of SOURCES) {
    try {
      const bundle: Record<string, unknown[]> = {}
      for (let i = 0; i < HEAVY_FILES.length; i++) {
        const file = HEAVY_FILES[i]
        bundle[file] = await source.fetch(file, (ratio) =>
          onProgress?.({
            source: source.label,
            file,
            index: i,
            count: HEAVY_FILES.length,
            ratio,
          }),
        )
      }

      // Feed data (languages) is 8 MB on its own — carry it over from the snapshot.
      const languagesById = new Map(
        previous.catalog.channels.map((c) => [c.id, c.languages]),
      )

      const { catalog } = mergeCatalog(bundle as unknown as RawBundle, {
        generatedAt: new Date().toISOString(),
        source: source.label,
        upstream: "https://github.com/iptv-org/iptv",
      })
      for (const channel of catalog.channels) {
        if (!channel.languages.length) {
          const carried = languagesById.get(channel.id)
          if (carried?.length) channel.languages = carried
        }
      }

      return {
        catalog,
        meta: { ...previous.meta, generatedAt: catalog.generatedAt },
        source: source.label,
      }
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error))
    }
  }

  throw new Error(
    `Could not reach the iptv-org catalog (${lastError?.message ?? "unknown error"}). ` +
      `The bundled snapshot is still available.`,
  )
}

/** Rough download size, shown before the user commits to a sync. */
export const SYNC_SIZE_HINT = "~18 MB"
