import * as React from "react"
import { Heart, Search, Settings2, Shuffle } from "lucide-react"
import { Link, useLocation, useNavigate } from "react-router-dom"

import { ChannelLogo } from "@/components/channel/channel-logo"
import { usePlayer } from "@/components/player/player-context"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { useCatalog } from "@/lib/catalog"
import { filterChannels } from "@/lib/search"
import { resolveProtocol, useSettings } from "@/stores/settings"

const TITLES: [RegExp, string][] = [
  [/^\/$/, "Home"],
  [/^\/browse/, "Browse"],
  [/^\/favourites/, "Favourites"],
  [/^\/my-streams/, "My streams"],
  [/^\/watch\//, "Now watching"],
]

export function SiteHeader({
  onOpenSearch,
  onOpenSettings,
}: {
  onOpenSearch: () => void
  onOpenSettings: () => void
}) {
  const location = useLocation()
  const navigate = useNavigate()
  const { index, meta } = useCatalog()
  const settings = useSettings()
  const { channel, status } = usePlayer()

  const title = React.useMemo(
    () => TITLES.find(([pattern]) => pattern.test(location.pathname))?.[1] ?? "Live TV Hub",
    [location.pathname],
  )

  const playRandom = React.useCallback(() => {
    const { channels } = filterChannels(
      index,
      {
        protocol: resolveProtocol(settings.protocol),
        hideHeaderOnly: settings.hideHeaderOnly,
        hideGeoBlocked: settings.hideGeoBlocked,
        sort: "relevance",
      },
      meta,
    )
    const pool = channels.slice(0, Math.min(400, channels.length))
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/watch/${encodeURIComponent(pick.id)}`)
  }, [index, meta, navigate, settings.hideGeoBlocked, settings.hideHeaderOnly, settings.protocol])

  const showNowPlaying = channel && !location.pathname.startsWith("/watch/")

  return (
    <header className="sticky top-0 z-20 flex h-14 shrink-0 items-center gap-2 border-b bg-background/85 px-3 backdrop-blur-md sm:px-5">
      <SidebarTrigger className="-ml-1.5" />
      <Separator orientation="vertical" className="mr-1 h-4" />
      <span className="hidden text-sm font-medium tracking-tight text-muted-foreground sm:inline">
        {title}
      </span>

      {showNowPlaying ? (
        <Link
          to={`/watch/${encodeURIComponent(channel.id)}`}
          className="ml-1 flex min-w-0 max-w-56 items-center gap-2 rounded-full border bg-card py-1 pr-3 pl-1 transition-colors hover:bg-accent"
        >
          <ChannelLogo channel={channel} className="size-6 shrink-0 rounded-full" />
          <span className="min-w-0">
            <span className="flex items-center gap-1.5">
              <span
                className={`size-1.5 shrink-0 rounded-full ${
                  status === "playing" ? "animate-live-pulse bg-red-500" : "bg-muted-foreground/50"
                }`}
              />
              <span className="truncate text-xs font-medium">{channel.name}</span>
            </span>
          </span>
        </Link>
      ) : null}

      <div className="ml-auto flex items-center gap-1.5">
        <Button
          variant="outline"
          className="h-9 w-40 justify-start gap-2 text-muted-foreground shadow-xs sm:w-56 md:w-72"
          onClick={onOpenSearch}
        >
          <Search className="size-4" />
          <span className="hidden truncate text-sm font-normal sm:inline">Search channels…</span>
          <Kbd className="ml-auto hidden sm:inline-flex">Ctrl K</Kbd>
        </Button>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" className="sm:hidden" onClick={onOpenSearch} aria-label="Search">
              <Search />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Search</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={playRandom} aria-label="Play a random channel">
              <Shuffle />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Surprise me</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" asChild aria-label="Favourites">
              <Link to="/favourites">
                <Heart />
              </Link>
            </Button>
          </TooltipTrigger>
          <TooltipContent>Favourites</TooltipContent>
        </Tooltip>

        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon" onClick={onOpenSettings} aria-label="Settings">
              <Settings2 />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Settings</TooltipContent>
        </Tooltip>
      </div>
    </header>
  )
}
