import { Heart, Play, ShieldAlert } from "lucide-react"
import { Link } from "react-router-dom"

import { MAX_QUEUE } from "@/components/channel/channel-card"
import { ChannelLogo } from "@/components/channel/channel-logo"
import { useCatalog } from "@/lib/catalog"
import { categoryName, countryInfo } from "@/lib/collections"
import { qualityLabel } from "@/lib/format"
import type { Channel } from "@/lib/iptv/types"
import { cn } from "@/lib/utils"
import { useLibrary } from "@/stores/library"

export function ChannelListItem({
  channel,
  queue,
  className,
}: {
  channel: Channel
  queue?: string[]
  className?: string
}) {
  const { meta } = useCatalog()
  const isFav = useLibrary((s) => s.favorites.includes(channel.id))
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)

  const country = countryInfo(channel.country, meta)
  const quality = qualityLabel(channel.sources.find((s) => s.quality)?.quality)
  const geoBlocked = channel.sources.some((s) => s.labels?.includes("Geo-blocked"))

  return (
    <div className={cn("group/row relative", className)}>
      <Link
        to={`/watch/${encodeURIComponent(channel.id)}`}
        state={queue?.length ? { q: queue.slice(0, MAX_QUEUE) } : undefined}
        data-tv-item=""
        data-channel-id={channel.id}
        className="flex items-center gap-3 rounded-lg border border-transparent p-2 pr-12 transition-colors hover:border-border hover:bg-accent/60 focus-visible:border-transparent focus-visible:bg-accent/60 focus-visible:ring-4 focus-visible:ring-ring/70 data-[tv-focused=true]:border-transparent data-[tv-focused=true]:bg-accent data-[tv-focused=true]:ring-4 data-[tv-focused=true]:ring-ring/70"
      >
        <ChannelLogo
          channel={channel}
          className="size-11 shrink-0 rounded-md ring-1 ring-border/70 sm:size-12"
        />

        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium leading-tight">{channel.name}</p>
          <p className="mt-0.5 flex items-center gap-1.5 truncate text-xs text-muted-foreground">
            <span aria-hidden>{country.flag}</span>
            <span className="truncate">{country.name}</span>
            {channel.categories.length ? (
              <>
                <span aria-hidden className="opacity-40">
                  ·
                </span>
                <span className="truncate">
                  {channel.categories.slice(0, 2).map((c) => categoryName(c, meta)).join(", ")}
                </span>
              </>
            ) : null}
          </p>
        </div>

        <div className="hidden shrink-0 items-center gap-1.5 sm:flex">
          {quality ? (
            <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-bold text-muted-foreground">
              {quality}
            </span>
          ) : null}
          {geoBlocked ? (
            <span className="flex items-center gap-0.5 rounded bg-amber-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
              <ShieldAlert className="size-2.5" /> geo
            </span>
          ) : null}
          <span className="rounded bg-muted px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground">
            {channel.sources.length} {channel.sources.length === 1 ? "source" : "sources"}
          </span>
        </div>

        <span className="pointer-events-none absolute right-2.5 flex size-8 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 transition group-hover/row:opacity-100">
          <Play className="size-4 translate-x-px fill-current" />
        </span>
      </Link>

      <button
        type="button"
        onClick={(event) => {
          event.preventDefault()
          event.stopPropagation()
          toggleFavorite(channel.id)
        }}
        aria-label={isFav ? `Remove ${channel.name} from favourites` : `Add ${channel.name} to favourites`}
        aria-pressed={isFav}
        className={cn(
          "absolute top-1/2 right-2 z-10 flex size-8 -translate-y-1/2 items-center justify-center rounded-full text-muted-foreground transition",
          "opacity-0 group-hover/row:opacity-100 focus-visible:opacity-100 hover:bg-muted hover:text-foreground",
          isFav && "opacity-100",
        )}
      >
        <Heart className={cn("size-4", isFav && "fill-red-500 text-red-500")} />
      </button>
    </div>
  )
}
