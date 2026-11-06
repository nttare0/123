import * as React from "react"
import { ArrowUpRight } from "lucide-react"
import { Link } from "react-router-dom"

import { ChannelGrid } from "@/components/channel/channel-grid"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/lib/catalog"
import { HOME_CATEGORIES, categoryName, countryInfo } from "@/lib/collections"
import { useDetectedCountry } from "@/lib/country"
import { isListable, popularity } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useSettings } from "@/stores/settings"

export function HomePage() {
  const { index, meta } = useCatalog()
  const homeCountry = useSettings((s) => s.homeCountry)
  const hideHeaderOnly = useSettings((s) => s.hideHeaderOnly)
  const detectedCountry = useDetectedCountry(!homeCountry)
  const [category, setCategory] = React.useState("")
  const countryCode = homeCountry || detectedCountry
  const country = countryCode ? countryInfo(countryCode, meta) : null

  const { channels, localCount } = React.useMemo(() => {
    const eligible = index.channels.filter(
      (channel) => isListable(channel, hideHeaderOnly) &&
        (!category || channel.categories.includes(category)),
    )
    const local = eligible.filter((channel) => channel.country === countryCode)
    const rest = eligible.filter((channel) => channel.country !== countryCode)
    const rank = (a: typeof local[number], b: typeof local[number]) =>
      popularity(b) - popularity(a) || a.name.localeCompare(b.name)
    local.sort(rank)
    rest.sort(rank)
    // A single, bounded selection keeps Home calm; the full catalog is in Browse.
    return { channels: [...local, ...rest].slice(0, 24), localCount: local.length }
  }, [category, countryCode, hideHeaderOnly, index.channels])

  return (
    <main className="mx-auto w-full max-w-6xl space-y-7 px-4 py-7 sm:px-6 sm:py-10">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-widest text-muted-foreground">Live TV</p>
          <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Find something to watch.</h1>
          <p className="max-w-lg text-sm text-muted-foreground">
            {country
              ? `${country.flag} Channels from ${country.name}, then picks from around the world.`
              : "A few good places to start. Explore channels from around the world."}
          </p>
          {country && !homeCountry ? (
            <p className="text-xs text-muted-foreground">Approximate network location · change in Settings</p>
          ) : null}
        </div>
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link to="/browse">Browse all <ArrowUpRight className="size-3.5" /></Link>
        </Button>
      </header>

      <div className="flex flex-wrap gap-1 border-b pb-4" role="group" aria-label="Channel category">
        {[{ id: "", name: "For you" }, ...HOME_CATEGORIES.map((id) => ({ id, name: categoryName(id, meta) }))].map((item) => (
          <button
            key={item.id}
            type="button"
            aria-pressed={category === item.id}
            onClick={() => setCategory(item.id)}
            className={cn(
              "rounded-full px-4 py-2 text-sm font-medium transition-colors",
              category === item.id ? "bg-foreground text-background" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            {item.name}
          </button>
        ))}
      </div>

      <section className="space-y-4" aria-label="Suggested channels">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 className="text-sm font-medium">{category ? categoryName(category, meta) : "Your channel picks"}</h2>
          <span className="text-xs text-muted-foreground">
            {localCount && country ? `${Math.min(localCount, 24)} from ${country.name} first` : "Around the world"}
          </span>
        </div>
        <ChannelGrid channels={channels} />
      </section>
    </main>
  )
}
