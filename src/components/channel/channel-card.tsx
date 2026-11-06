import { Heart, Play } from "lucide-react"
import { Link } from "react-router-dom"

import { ChannelLogo } from "@/components/channel/channel-logo"
import { useCatalog } from "@/lib/catalog"
import { countryInfo } from "@/lib/collections"
import type { Channel } from "@/lib/iptv/types"
import { cn } from "@/lib/utils"
import { useLibrary } from "@/stores/library"

export const MAX_QUEUE = 300

interface ChannelCardProps {
  channel: Channel
  /** Channel ids that ◀ / ▶ walk through once this card opens the player. */
  queue?: string[]
  className?: string
}

export function ChannelCard({ channel, queue, className }: ChannelCardProps) {
  const { meta } = useCatalog()
  const isFav = useLibrary((s) => s.favorites.includes(channel.id))
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)
  const country = countryInfo(channel.country, meta)

  return (
    <div className={cn("group/card relative", className)}>
      <Link
        to={`/watch/${encodeURIComponent(channel.id)}`}
        state={queue?.length ? { q: queue.slice(0, MAX_QUEUE) } : undefined}
        data-tv-item=""
        data-channel-id={channel.id}
        aria-label={`${channel.name} — ${country.name}`}
        className="block rounded-xl outline-none focus-visible:ring-4 focus-visible:ring-ring/70 focus-visible:ring-offset-2 focus-visible:ring-offset-background data-[tv-focused=true]:ring-4 data-[tv-focused=true]:ring-ring/70 data-[tv-focused=true]:ring-offset-2"
      >
        <div className="relative aspect-video overflow-hidden rounded-lg shadow-xs ring-1 ring-border/70 transition duration-300 group-hover/card:shadow-lg group-hover/card:ring-ring/60">
          <ChannelLogo
            channel={channel}
            className="size-full transition-transform duration-500 group-hover/card:scale-[1.04]"
          />

          <div className="absolute inset-0 flex items-center justify-center bg-black/0 transition-colors duration-300 group-hover/card:bg-black/30">
            <span className="flex size-10 scale-75 items-center justify-center rounded-full bg-primary text-primary-foreground opacity-0 shadow-lg transition duration-300 group-hover/card:scale-100 group-hover/card:opacity-100">
              <Play className="size-5 translate-x-px fill-current" />
            </span>
          </div>
        </div>

        <div className="mt-2 space-y-0.5 px-0.5">
          <p className="truncate text-sm font-medium leading-tight">{channel.name}</p>
          <p className="flex items-center gap-1 truncate text-xs text-muted-foreground">
            <span aria-hidden>{country.flag}</span>
            <span className="truncate">{country.name}</span>
          </p>
        </div>
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
          "absolute top-1.5 right-1.5 z-10 flex size-7 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-sm transition",
          "opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 hover:bg-black/80",
          isFav && "opacity-100",
        )}
      >
        <Heart className={cn("size-3.5", isFav && "fill-red-500 text-red-500")} />
      </button>
    </div>
  )
}
