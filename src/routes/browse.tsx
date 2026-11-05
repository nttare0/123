import * as React from "react"
import {
  Check,
  ChevronDown,
  Globe2,
  Grid2x2,
  Languages,
  Rows3,
  Search,
  SlidersHorizontal,
  Tag,
  X,
} from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { ChannelGrid } from "@/components/channel/channel-grid"
import { CountryPicker } from "@/components/country-picker"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { useCatalog } from "@/lib/catalog"
import {
  categoryIcon,
  countryInfo,
  EAST_AFRICA,
  languageName,
  NORTH_AFRICA,
  SOUTHERN_AFRICA,
  WEST_AFRICA,
} from "@/lib/collections"
import { compactNumber } from "@/lib/format"
import { filterChannels, type SortKey } from "@/lib/search"
import { cn } from "@/lib/utils"
import { resolveProtocol, useSettings } from "@/stores/settings"

const CUSTOM_REGIONS: Record<string, { name: string; countries: string[] }> = {
  EAST: { name: "East Africa", countries: EAST_AFRICA },
  WESTAF: { name: "West Africa", countries: WEST_AFRICA },
  SOUTHAF: { name: "Southern Africa", countries: SOUTHERN_AFRICA },
  NORTHAF: { name: "North Africa", countries: NORTH_AFRICA },
}

function listParam(value: string | null): string[] {
  return value ? value.split(",").filter(Boolean) : []
}

interface FilterPopoverProps {
  label: string
  icon: React.ElementType
  options: { value: string; label: string; count?: number; icon?: React.ReactNode }[]
  selected: string[]
  onToggle: (value: string) => void
  searchable?: boolean
  placeholder?: string
}

function FilterPopover({
  label,
  icon: Icon,
  options,
  selected,
  onToggle,
  searchable = true,
  placeholder,
}: FilterPopoverProps) {
  const [open, setOpen] = React.useState(false)
  const [query, setQuery] = React.useState("")

  const filtered = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    const list = q
      ? options.filter((o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q))
      : options
    return list.slice(0, 300)
  }, [options, query])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn("h-9 gap-1.5 font-normal", selected.length && "border-ring/60 bg-accent")}
        >
          <Icon className="size-4 text-muted-foreground" />
          <span className="max-w-28 truncate">
            {selected.length === 0
              ? label
              : selected.length === 1
                ? (options.find((o) => o.value === selected[0])?.label ?? label)
                : `${label} · ${selected.length}`}
          </span>
          <ChevronDown className="size-3.5 text-muted-foreground" />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="start" className="w-72 p-0">
        <Command shouldFilter={false}>
          {searchable ? (
            <CommandInput
              placeholder={placeholder ?? `Search ${label.toLowerCase()}…`}
              value={query}
              onValueChange={setQuery}
            />
          ) : null}
          <CommandList className="max-h-72">
            <CommandEmpty>Nothing matches “{query}”.</CommandEmpty>
            <CommandGroup>
              {filtered.map((option) => {
                const active = selected.includes(option.value)
                return (
                  <CommandItem
                    key={option.value}
                    value={option.value}
                    onSelect={() => onToggle(option.value)}
                    className="gap-2"
                  >
                    {option.icon}
                    <span className="min-w-0 flex-1 truncate">{option.label}</span>
                    {option.count ? (
                      <span className="text-xs text-muted-foreground">
                        {compactNumber(option.count)}
                      </span>
                    ) : null}
                    {active ? <Check className="size-4 text-primary" /> : null}
                  </CommandItem>
                )
              })}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}

export function BrowsePage() {
  const { index, meta } = useCatalog()
  const settings = useSettings()
  const setSettings = useSettings((s) => s.set)
  const [params, setParams] = useSearchParams()

  const query = params.get("q") ?? ""
  const countries = listParam(params.get("country"))
  const categories = listParam(params.get("category"))
  const languages = listParam(params.get("language"))
  const region = params.get("region") ?? ""
  const sort = (params.get("sort") as SortKey | null) ?? (query ? "relevance" : "name")
  const group = params.get("group") ?? ""
  const hd = params.get("hd") === "1"
  const multi = params.get("multi") === "1"
  const view = (params.get("view") as "grid" | "list" | null) ?? settings.view

  const update = React.useCallback(
    (patch: Record<string, string | null>, options?: { replace?: boolean }) => {
      setParams(
        (prev) => {
          const next = new URLSearchParams(prev)
          for (const [key, value] of Object.entries(patch)) {
            if (value === null || value === "") next.delete(key)
            else next.set(key, value)
          }
          return next
        },
        { replace: options?.replace ?? true },
      )
    },
    [setParams],
  )

  const toggleIn = (key: string, value: string) => {
    const current = listParam(params.get(key))
    const next = current.includes(value)
      ? current.filter((v) => v !== value)
      : [...current, value]
    update({ [key]: next.join(",") })
  }

  const regionCountries = React.useMemo(() => {
    if (!region) return undefined
    if (CUSTOM_REGIONS[region]) return CUSTOM_REGIONS[region].countries
    return meta.regions.find((r) => r.code === region)?.countries
  }, [meta.regions, region])

  const countryOptions = React.useMemo(
    () =>
      [...index.countryCounts.entries()]
        .filter(([code]) => code !== "CUSTOM")
        .sort((a, b) => b[1] - a[1])
        .map(([code, count]) => {
          const info = countryInfo(code, meta)
          return {
            value: code,
            label: `${info.name}`,
            count,
            icon: <span aria-hidden>{info.flag}</span>,
          }
        }),
    [index.countryCounts, meta],
  )

  const categoryOptions = React.useMemo(
    () =>
      meta.categories
        .filter((c) => c.id !== "xxx")
        .map((c) => {
          const Icon = categoryIcon(c.id)
          return {
            value: c.id,
            label: c.name,
            count: index.categoryCounts.get(c.id) ?? 0,
            icon: <Icon className="size-4 text-muted-foreground" />,
          }
        })
        .sort((a, b) => b.count - a.count),
    [index.categoryCounts, meta.categories],
  )

  const languageOptions = React.useMemo(
    () =>
      [...index.languageCounts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 120)
        .map(([code, count]) => ({
          value: code,
          label: languageName(code, meta),
          count,
        })),
    [index.languageCounts, meta],
  )

  const results = React.useMemo(() => {
    const effectiveCountries = countries.length ? countries : regionCountries
    return filterChannels(
      index,
      {
        query,
        countries: effectiveCountries,
        categories,
        languages,
        sort,
        protocol: resolveProtocol(settings.protocol),
        hideHeaderOnly: settings.hideHeaderOnly,
        hideGeoBlocked: settings.hideGeoBlocked,
        hideNot247: settings.hideNot247,
      },
      meta,
    )
  }, [
    categories,
    countries,
    index,
    languages,
    meta,
    query,
    regionCountries,
    settings.hideGeoBlocked,
    settings.hideNot247,
    settings.hideHeaderOnly,
    settings.protocol,
    sort,
  ])

  const filtered = React.useMemo(() => {
    let list = results.channels
    if (hd) list = list.filter((c) => c.sources.some((s) => s.quality && /(1080|2160|1440|720)/.test(s.quality)))
    if (multi) list = list.filter((c) => c.sources.length > 1)
    return list
  }, [hd, multi, results.channels])

  const activeChips = React.useMemo(() => {
    const chips: { key: string; label: string; onRemove: () => void }[] = []
    if (query) chips.push({ key: "q", label: `“${query}”`, onRemove: () => update({ q: null }) })
    for (const code of countries) {
      const info = countryInfo(code, meta)
      chips.push({
        key: `c-${code}`,
        label: `${info.flag} ${info.name}`,
        onRemove: () => update({ country: countries.filter((c) => c !== code).join(",") }),
      })
    }
    if (region) {
      const name =
        CUSTOM_REGIONS[region]?.name ?? meta.regions.find((r) => r.code === region)?.name ?? region
      chips.push({ key: "r", label: `🌍 ${name}`, onRemove: () => update({ region: null }) })
    }
    for (const id of categories) {
      chips.push({
        key: `cat-${id}`,
        label: meta.categories.find((c) => c.id === id)?.name ?? id,
        onRemove: () => update({ category: categories.filter((c) => c !== id).join(",") }),
      })
    }
    for (const code of languages) {
      chips.push({
        key: `l-${code}`,
        label: languageName(code, meta),
        onRemove: () => update({ language: languages.filter((l) => l !== code).join(",") }),
      })
    }
    if (hd) chips.push({ key: "hd", label: "HD or better", onRemove: () => update({ hd: null }) })
    if (multi)
      chips.push({ key: "multi", label: "Multiple sources", onRemove: () => update({ multi: null }) })
    return chips
  }, [categories, countries, hd, languages, meta, multi, query, region, update])

  const heading = React.useMemo(() => {
    if (query) return `Results for “${query}”`
    if (countries.length === 1) {
      const info = countryInfo(countries[0], meta)
      return `${info.flag} ${info.name}`
    }
    if (region) {
      return (
        CUSTOM_REGIONS[region]?.name ?? meta.regions.find((r) => r.code === region)?.name ?? "Region"
      )
    }
    if (categories.length === 1) {
      return `${meta.categories.find((c) => c.id === categories[0])?.name ?? categories[0]} channels`
    }
    return "All channels"
  }, [categories, countries, meta, query, region])

  /* ---------------- countries overview ---------------- */
  if (group === "country") {
    return (
      <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6">
        <header className="mb-5">
          <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Countries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {countryOptions.length} territories with {index.channels.length.toLocaleString()} indexed
            channels.
          </p>
        </header>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
          {countryOptions.map((option) => (
            <Link
              key={option.value}
              to={`/browse?country=${option.value}`}
              data-tv-item=""
              className="group flex items-center gap-3 rounded-xl border bg-card p-3 transition-colors hover:border-ring/50 hover:bg-accent focus-visible:ring-4 focus-visible:ring-ring/70 data-[tv-focused=true]:ring-4 data-[tv-focused=true]:ring-ring/70"
            >
              <span className="text-2xl leading-none" aria-hidden>
                {option.icon}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-medium">{option.label}</span>
                <span className="block text-xs text-muted-foreground">
                  {option.count?.toLocaleString()} channels
                </span>
              </span>
            </Link>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6">
      <header className="mb-4 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0">
          <h1 className="truncate text-xl font-semibold tracking-tight sm:text-2xl">{heading}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {filtered.length.toLocaleString()}{" "}
            {filtered.length === 1 ? "channel" : "channels"} available to play
            {settings.hideHeaderOnly ? " · sources needing custom headers are hidden" : ""}
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Select value={sort} onValueChange={(value) => update({ sort: value })}>
            <SelectTrigger className="h-9 w-40 font-normal" size="sm">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="relevance">Best match</SelectItem>
              <SelectItem value="name">Name (A–Z)</SelectItem>
              <SelectItem value="country">Country</SelectItem>
              <SelectItem value="sources">Most sources</SelectItem>
              <SelectItem value="quality">Best quality</SelectItem>
            </SelectContent>
          </Select>

          <ToggleGroup
            type="single"
            value={view}
            onValueChange={(value) => {
              if (!value) return
              update({ view: value })
              setSettings({ view: value as "grid" | "list" })
            }}
            className="rounded-md border bg-background p-0.5"
            variant="outline"
          >
            <ToggleGroupItem value="grid" aria-label="Grid view" className="h-8 w-8 p-0 data-[state=on]:bg-accent">
              <Grid2x2 className="size-4" />
            </ToggleGroupItem>
            <ToggleGroupItem value="list" aria-label="List view" className="h-8 w-8 p-0 data-[state=on]:bg-accent">
              <Rows3 className="size-4" />
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </header>

      {/* filters */}
      <div className="sticky top-14 z-10 -mx-4 mb-4 border-y bg-background/90 px-4 py-2.5 backdrop-blur-md sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-2">
          <div className="relative min-w-40 flex-1 sm:max-w-80">
            <Search className="absolute top-1/2 left-2.5 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={query}
              onChange={(event) => update({ q: event.target.value }, { replace: true })}
              placeholder="Search channels…"
              className="h-9 pl-8"
              aria-label="Search channels"
            />
            {query ? (
              <button
                type="button"
                onClick={() => update({ q: null })}
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 text-muted-foreground hover:text-foreground"
                aria-label="Clear search"
              >
                <X className="size-3.5" />
              </button>
            ) : null}
          </div>

          <CountryPicker
            allowAll
            withChannelsOnly
            className="h-9 w-auto min-w-36 max-w-52"
            value={countries[0] ?? ""}
            onChange={(code) => update({ country: code, region: null })}
            placeholder="Country"
          />

          <FilterPopover
            label="Categories"
            icon={Tag}
            options={categoryOptions}
            selected={categories}
            onToggle={(value) => toggleIn("category", value)}
          />

          <FilterPopover
            label="Languages"
            icon={Languages}
            options={languageOptions}
            selected={languages}
            onToggle={(value) => toggleIn("language", value)}
          />

          <FilterPopover
            label="Regions"
            icon={Globe2}
            searchable={false}
            options={[
              ...Object.entries(CUSTOM_REGIONS).map(([code, r]) => ({
                value: code,
                label: r.name,
              })),
              ...meta.regions.map((r) => ({ value: r.code, label: r.name })),
            ]}
            selected={region ? [region] : []}
            onToggle={(value) => update({ region: value === region ? null : value, country: null })}
          />

          <div className="ml-auto flex items-center gap-1.5">
            <Button
              variant={hd ? "default" : "outline"}
              size="sm"
              className="h-9"
              onClick={() => update({ hd: hd ? null : "1" })}
            >
              HD
            </Button>
            <Button
              variant={multi ? "default" : "outline"}
              size="sm"
              className="h-9 gap-1.5"
              onClick={() => update({ multi: multi ? null : "1" })}
            >
              <SlidersHorizontal className="size-3.5" /> Multi-source
            </Button>
          </div>
        </div>

        {activeChips.length ? (
          <div className="mt-2 flex flex-wrap items-center gap-1.5">
            {activeChips.map((chip) => (
              <Badge key={chip.key} variant="secondary" className="gap-1.5 pr-1 font-normal">
                {chip.label}
                <button
                  type="button"
                  onClick={chip.onRemove}
                  className="rounded-full p-0.5 hover:bg-muted-foreground/20"
                  aria-label={`Remove filter ${chip.label}`}
                >
                  <X className="size-3" />
                </button>
              </Badge>
            ))}
            <Button
              variant="ghost"
              size="sm"
              className="h-6 px-2 text-xs text-muted-foreground"
              onClick={() =>
                setParams(new URLSearchParams(), { replace: true })
              }
            >
              Clear all
            </Button>
          </div>
        ) : null}
      </div>

      <ChannelGrid channels={filtered} view={view} />
    </div>
  )
}
