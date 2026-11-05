import * as React from "react"

import { customToChannel, useLibrary } from "@/stores/library"

import { syncCatalog, type SyncProgress } from "./iptv/sync"
import type { Catalog, Channel, Meta } from "./iptv/types"
import { buildIndex, type CatalogIndex } from "./search"

const EMPTY_META: Meta = {
  generatedAt: "",
  countries: [],
  categories: [],
  languages: [],
  regions: [],
}

const EMPTY_INDEX: CatalogIndex = {
  channels: [],
  byId: new Map(),
  byCountry: new Map(),
  byCategory: new Map(),
  haystack: new Map(),
  countryCounts: new Map(),
  categoryCounts: new Map(),
  languageCounts: new Map(),
  totalSources: 0,
}

interface CatalogContextValue {
  status: "loading" | "ready" | "error"
  error: string | null
  /** 0 → 1 while the snapshot downloads. */
  progress: number
  /** Snapshot channels plus anything the viewer added themselves. */
  channels: Channel[]
  index: CatalogIndex
  meta: Meta
  generatedAt: string
  source: string
  /** True once the catalog has been refreshed in this session. */
  live: boolean
  syncing: boolean
  syncProgress: SyncProgress | null
  syncError: string | null
  getChannel: (id: string | undefined | null) => Channel | undefined
  refresh: () => void
  sync: () => Promise<number>
}

const CatalogContext = React.createContext<CatalogContextValue | null>(null)

async function fetchJson(url: string, onProgress?: (ratio: number) => void): Promise<unknown> {
  const res = await fetch(url, { headers: { accept: "application/json" } })
  if (!res.ok) throw new Error(`${url} → HTTP ${res.status}`)

  const total = Number(res.headers.get("content-length") ?? 0)
  if (!res.body || !total) {
    const data = await res.json()
    onProgress?.(1)
    return data
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
    onProgress?.(Math.min(0.99, received / total))
  }
  text += decoder.decode()
  onProgress?.(1)
  return JSON.parse(text)
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<CatalogContextValue["status"]>("loading")
  const [error, setError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [catalog, setCatalog] = React.useState<Catalog | null>(null)
  const [meta, setMeta] = React.useState<Meta>(EMPTY_META)
  const [live, setLive] = React.useState(false)
  const [syncing, setSyncing] = React.useState(false)
  const [syncProgress, setSyncProgress] = React.useState<SyncProgress | null>(null)
  const [syncError, setSyncError] = React.useState<string | null>(null)
  const [reloadKey, setReloadKey] = React.useState(0)

  const custom = useLibrary((s) => s.custom)

  React.useEffect(() => {
    let cancelled = false

    async function load() {
      setStatus("loading")
      setError(null)
      setProgress(0)
      try {
        const [metaData, catalogData] = await Promise.all([
          fetchJson("/data/meta.json", (ratio) => setProgress(ratio * 0.08)),
          fetchJson("/data/catalog.json", (ratio) => setProgress(0.08 + ratio * 0.92)),
        ])
        if (cancelled) return
        setMeta(metaData as Meta)
        setCatalog(catalogData as Catalog)
        setStatus("ready")
        setProgress(1)
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [reloadKey])

  /** Viewer-added streams are folded into the catalog so every screen sees one list. */
  const channels = React.useMemo(() => {
    if (!catalog) return []
    if (!custom.length) return catalog.channels
    return [...custom.map(customToChannel), ...catalog.channels]
  }, [catalog, custom])

  const index = React.useMemo(
    () => (channels.length ? buildIndex(channels, meta) : EMPTY_INDEX),
    [channels, meta],
  )

  const getChannel = React.useCallback(
    (id: string | undefined | null) => (id ? index.byId.get(id) : undefined),
    [index],
  )

  const sync = React.useCallback(async (): Promise<number> => {
    if (!catalog) return 0
    setSyncing(true)
    setSyncError(null)
    try {
      const result = await syncCatalog({ catalog, meta }, setSyncProgress)
      setCatalog(result.catalog)
      setMeta(result.meta)
      setLive(true)
      return result.catalog.channels.length
    } catch (err) {
      setSyncError(err instanceof Error ? err.message : String(err))
      throw err
    } finally {
      setSyncing(false)
      setSyncProgress(null)
    }
  }, [catalog, meta])

  const value = React.useMemo<CatalogContextValue>(
    () => ({
      status,
      error,
      progress,
      channels,
      index,
      meta,
      generatedAt: catalog?.generatedAt ?? "",
      source: catalog?.source ?? "iptv-org",
      live,
      syncing,
      syncProgress,
      syncError,
      getChannel,
      refresh: () => setReloadKey((k) => k + 1),
      sync,
    }),
    [
      status,
      error,
      progress,
      channels,
      index,
      meta,
      catalog,
      live,
      syncing,
      syncProgress,
      syncError,
      getChannel,
      sync,
    ],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogContextValue {
  const context = React.useContext(CatalogContext)
  if (!context) throw new Error("useCatalog must be used inside <CatalogProvider>")
  return context
}

export function useChannel(id: string | undefined | null): Channel | undefined {
  const { getChannel } = useCatalog()
  return getChannel(id)
}
