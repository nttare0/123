import * as React from "react"
import { Search, X } from "lucide-react"
import { useSearchParams } from "react-router-dom"

import { ChannelGrid } from "@/components/channel/channel-grid"
import { CountryPicker } from "@/components/country-picker"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useCatalog } from "@/lib/catalog"
import { filterChannels } from "@/lib/search"
import { useSettings } from "@/stores/settings"

export function BrowsePage() {
  const { index, meta } = useCatalog()
  const hideHeaderOnly = useSettings((s) => s.hideHeaderOnly)
  const [params, setParams] = useSearchParams()

  const query = params.get("q") ?? ""
  const country = params.get("country") ?? ""
  const category = params.get("category") ?? ""
  const [draft, setDraft] = React.useState(query)

  React.useEffect(() => setDraft(query), [query])

  const setParam = (key: string, value: string) => {
    const next = new URLSearchParams(params)
    if (value) next.set(key, value)
    else next.delete(key)
    setParams(next, { replace: true })
  }

  const results = React.useMemo(
    () => filterChannels(index, { query, country, category, hideHeaderOnly }),
    [category, country, hideHeaderOnly, index, query],
  )

  const categories = React.useMemo(
    () =>
      [...meta.categories]
        .filter((c) => (index.categoryCounts.get(c.id) ?? 0) > 0)
        .sort(
          (a, b) =>
            (index.categoryCounts.get(b.id) ?? 0) - (index.categoryCounts.get(a.id) ?? 0) ||
            a.name.localeCompare(b.name),
        ),
    [index.categoryCounts, meta.categories],
  )

  const dirty = Boolean(query || country || category)

  return (
    <div className="w-full min-w-0 space-y-6 px-4 py-6 sm:px-6 lg:px-10">
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h1 className="text-lg font-semibold tracking-tight sm:text-xl">Browse</h1>
        <p className="text-xs text-muted-foreground tabular-nums">
          {results.length.toLocaleString()} channels
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <form
          className="relative min-w-0 flex-1 sm:max-w-xs"
          role="search"
          onSubmit={(event) => {
            event.preventDefault()
            setParam("q", draft)
          }}
        >
          <Search
            className="pointer-events-none absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            value={draft}
            onChange={(event) => {
              setDraft(event.target.value)
              if (!event.target.value && query) setParam("q", "")
            }}
            type="search"
            placeholder="Search channels"
            className="h-9 pr-8 pl-8"
            data-tv-item=""
          />
          {draft ? (
            <button
              type="button"
              onClick={() => {
                setDraft("")
                setParam("q", "")
              }}
              aria-label="Clear search"
              className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            >
              <X className="size-3.5" />
            </button>
          ) : null}
        </form>

        <CountryPicker
          className="h-9 w-40 sm:w-48"
          value={country}
          onChange={(value) => setParam("country", value)}
          allowAll
        />

        <select
          value={category}
          onChange={(event) => setParam("category", event.target.value)}
          aria-label="Category"
          className="h-9 rounded-lg border border-input bg-transparent px-2.5 text-sm shadow-xs outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          data-tv-item=""
        >
          <option value="">All categories</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>

        {dirty ? (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-muted-foreground"
            onClick={() => setParams(new URLSearchParams(), { replace: true })}
          >
            Clear
          </Button>
        ) : null}
      </div>

      <ChannelGrid
        channels={results}
        emptyAction={
          dirty ? (
            <Button variant="outline" size="sm" onClick={() => setParams(new URLSearchParams(), { replace: true })}>
              Clear filters
            </Button>
          ) : null
        }
      />
    </div>
  )
}
