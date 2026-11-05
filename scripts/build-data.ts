/**
 * Catalog sync — pulls the iptv-org datasets, merges them into one flat,
 * player-ready JSON bundle and writes it to `public/data/`.
 *
 *   npm run data:sync                 # cache -> GitHub -> published API
 *   npm run data:sync -- --source api # force the published CDN
 *   npm run data:sync -- --source cache
 *
 * Sources, in the order they are tried:
 *   1. `data/raw/*.json`   — a local cache from a previous run (offline friendly)
 *   2. GitHub blob API    — the `gh-pages` branch of `iptv-org/api`, which is
 *                           exactly what https://iptv-org.github.io/api serves
 *   3. published API      — https://iptv-org.github.io/api/*.json
 */
import { mkdir, readFile, writeFile } from "node:fs/promises"
import path from "node:path"
import { fileURLToPath } from "node:url"

import { buildMeta, mergeCatalog } from "../src/lib/iptv/merge.ts"
import type { RawBundle } from "../src/lib/iptv/types.ts"

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..")
const RAW_DIR = path.join(ROOT, "data", "raw")
const OUT_DIR = path.join(ROOT, "public", "data")

const CDN = "https://iptv-org.github.io/api"
const GH_OWNER = "iptv-org"
const GH_REPO = "api"
const GH_REF = "gh-pages"

const FILES = [
  "channels",
  "feeds",
  "streams",
  "logos",
  "countries",
  "categories",
  "languages",
  "regions",
  "blocklist",
] as const

type FileKey = (typeof FILES)[number]

const args = process.argv.slice(2)
const sourceArg = args.find((a) => a.startsWith("--source"))?.split("=")[1] ?? "auto"
const quiet = args.includes("--quiet")

function log(...msg: unknown[]) {
  if (!quiet) console.log(...msg)
}

async function tryCache(name: FileKey): Promise<unknown[] | null> {
  try {
    const buf = await readFile(path.join(RAW_DIR, `${name}.json`), "utf8")
    return JSON.parse(buf) as unknown[]
  } catch {
    return null
  }
}

async function fromCdn(name: FileKey): Promise<unknown[]> {
  const res = await fetch(`${CDN}/${name}.json`, {
    headers: { accept: "application/json" },
  })
  if (!res.ok) throw new Error(`${CDN}/${name}.json -> HTTP ${res.status}`)
  return (await res.json()) as unknown[]
}

async function fromGitHub(): Promise<Record<string, unknown[]>> {
  const headers: Record<string, string> = {
    accept: "application/vnd.github+json",
    "x-github-api-version": "2022-11-28",
  }
  if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`

  const treeRes = await fetch(
    `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/git/trees/${GH_REF}?recursive=1`,
    { headers },
  )
  if (!treeRes.ok) throw new Error(`GitHub tree -> HTTP ${treeRes.status}`)
  const tree = (await treeRes.json()) as {
    tree: { path: string; sha: string; type: string }[]
  }
  const byPath = new Map(tree.tree.map((entry) => [entry.path, entry]))

  const out: Record<string, unknown[]> = {}
  for (const name of FILES) {
    const entry = byPath.get(`${name}.json`)
    if (!entry) throw new Error(`${name}.json not found in ${GH_OWNER}/${GH_REPO}@${GH_REF}`)
    const res = await fetch(
      `https://api.github.com/repos/${GH_OWNER}/${GH_REPO}/git/blobs/${entry.sha}`,
      { headers },
    )
    if (!res.ok) throw new Error(`GitHub blob ${name}.json -> HTTP ${res.status}`)
    const blob = (await res.json()) as { content: string; encoding: string }
    out[name] = JSON.parse(Buffer.from(blob.content, "base64").toString("utf8")) as unknown[]
    log(`  ✓ github ${name}.json (${out[name].length.toLocaleString()} records)`)
  }
  return out
}

async function main() {
  const started = Date.now()
  log("▸ Syncing the iptv-org catalog…")

  const bundle: Partial<Record<FileKey, unknown[]>> = {}
  let usedSource = "cache"

  if (sourceArg === "cache") {
    for (const name of FILES) bundle[name] = (await tryCache(name)) ?? undefined
  } else if (sourceArg === "github" || sourceArg === "api") {
    usedSource = sourceArg
    if (sourceArg === "github") {
      Object.assign(bundle, await fromGitHub())
    } else {
      for (const name of FILES) {
        bundle[name] = await fromCdn(name)
        log(`  ✓ cdn ${name}.json (${bundle[name]?.length.toLocaleString()} records)`)
      }
    }
  } else {
    // auto: cache first, then GitHub (reachable from CI sandboxes), then the CDN
    for (const name of FILES) {
      const cached = await tryCache(name)
      if (cached) bundle[name] = cached
    }
    if (FILES.some((name) => !bundle[name])) {
      try {
        log("  · fetching from GitHub (iptv-org/api@gh-pages)")
        Object.assign(bundle, await fromGitHub())
        usedSource = "github"
      } catch (error) {
        log(`  · GitHub failed (${(error as Error).message}), falling back to ${CDN}`)
        for (const name of FILES) {
          if (!bundle[name]) bundle[name] = await fromCdn(name)
        }
        usedSource = "api"
      }
    }
  }

  const missing = FILES.filter((name) => !bundle[name]?.length)
  if (missing.length) {
    throw new Error(`Missing datasets: ${missing.join(", ")}. Run \`npm run data:sync\`.`)
  }

  // keep a local cache so the next sync can run offline
  await mkdir(RAW_DIR, { recursive: true })
  for (const name of FILES) {
    await writeFile(path.join(RAW_DIR, `${name}.json`), JSON.stringify(bundle[name]))
  }

  const generatedAt = new Date().toISOString()
  const raw = {
    channels: bundle.channels,
    feeds: bundle.feeds,
    streams: bundle.streams,
    logos: bundle.logos,
    countries: bundle.countries,
    categories: bundle.categories,
    languages: bundle.languages,
    regions: bundle.regions,
    blocklist: bundle.blocklist,
  } as unknown as RawBundle

  const { catalog, stats } = mergeCatalog(raw, {
    generatedAt,
    source: usedSource === "api" ? CDN : `github:${GH_OWNER}/${GH_REPO}@${GH_REF}`,
    upstream: "https://github.com/iptv-org/iptv",
  })
  const meta = buildMeta(raw, generatedAt)

  await mkdir(OUT_DIR, { recursive: true })
  const catalogPath = path.join(OUT_DIR, "catalog.json")
  const metaPath = path.join(OUT_DIR, "meta.json")
  await writeFile(catalogPath, JSON.stringify(catalog))
  await writeFile(metaPath, JSON.stringify(meta))

  const kb = (n: number) => `${(n / 1024).toFixed(0)} kB`
  log("")
  log(`  channels            ${stats.channels.toLocaleString()}`)
  log(`  playable sources    ${stats.sources.toLocaleString()}`)
  log(`  countries           ${stats.countries}`)
  log(`  dropped (rtmp/srt)  ${stats.skippedUnsupportedProtocol}`)
  log(`  dropped (blocked)   ${stats.skippedBlocked}`)
  log(`  headers-only chans  ${stats.skippedHeadersOnly}`)
  log("")
  log(`  public/data/catalog.json  ${kb(catalog.channels.length ? Buffer.byteLength(JSON.stringify(catalog)) : 0)}`)
  log(`  public/data/meta.json     ${kb(Buffer.byteLength(JSON.stringify(meta)))}`)
  log(`▸ Done in ${((Date.now() - started) / 1000).toFixed(1)}s`)
}

main().catch((error) => {
  console.error("✖ data:sync failed:", error instanceof Error ? error.message : error)
  process.exit(1)
})
