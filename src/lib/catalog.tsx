import * as React from "react"

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
  totalSources: 0,
}

interface CatalogContextValue {
  status: "loading" | "ready" | "error"
  error: string | null
  /** 0 → 1 while the snapshot downloads. */
  progress: number
  channels: Channel[]
  index: CatalogIndex
  meta: Meta
  generatedAt: string
  getChannel: (id: string | undefined | null) => Channel | undefined
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
  onProgress?.(1)
  return JSON.parse(text + decoder.decode())
}

export function CatalogProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = React.useState<CatalogContextValue["status"]>("loading")
  const [error, setError] = React.useState<string | null>(null)
  const [progress, setProgress] = React.useState(0)
  const [catalog, setCatalog] = React.useState<Catalog | null>(null)
  const [meta, setMeta] = React.useState<Meta>(EMPTY_META)

  React.useEffect(() => {
    let cancelled = false

    void (async () => {
      try {
        const [metaData, catalogData] = await Promise.all([
          fetchJson("/data/meta.json", (ratio) => !cancelled && setProgress(ratio * 0.08)),
          fetchJson("/data/catalog.json", (ratio) => !cancelled && setProgress(0.08 + ratio * 0.92)),
        ])
        if (cancelled) return
        setMeta(metaData as Meta)
        setCatalog(catalogData as Catalog)
        setProgress(1)
        setStatus("ready")
      } catch (err) {
        if (cancelled) return
        setError(err instanceof Error ? err.message : String(err))
        setStatus("error")
      }
    })()

    return () => {
      cancelled = true
    }
  }, [])

  const index = React.useMemo(
    () => (catalog ? buildIndex(catalog.channels, meta) : EMPTY_INDEX),
    [catalog, meta],
  )

  const getChannel = React.useCallback(
    (id: string | undefined | null) => (id ? index.byId.get(id) : undefined),
    [index],
  )

  const value = React.useMemo<CatalogContextValue>(
    () => ({
      status,
      error,
      progress,
      channels: catalog?.channels ?? [],
      index,
      meta,
      generatedAt: catalog?.generatedAt ?? "",
      getChannel,
    }),
    [catalog, error, getChannel, index, meta, progress, status],
  )

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>
}

export function useCatalog(): CatalogContextValue {
  const context = React.useContext(CatalogContext)
  if (!context) throw new Error("useCatalog must be used inside <CatalogProvider>")
  return context
}
