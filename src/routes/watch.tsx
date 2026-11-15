import * as React from "react"
import { Copy, Heart, Play, Tv } from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ChannelLogo } from "@/components/channel/channel-logo"
import { ChannelRow } from "@/components/channel/channel-row"
import { usePlayer } from "@/components/player/player-context"
import { Button } from "@/components/ui/button"
import { useHotkeys } from "@/hooks/use-hotkeys"
import { useCatalog } from "@/lib/catalog"
import { categoryName, countryInfo, isPlayable } from "@/lib/collections"
import { hostnameOf, qualityLabel } from "@/lib/format"
import { sourceWarnings } from "@/lib/playback"
import type { Channel } from "@/lib/iptv/types"
import { popularity } from "@/lib/search"
import { cn } from "@/lib/utils"
import { useLibrary } from "@/stores/library"
import { useSettings } from "@/stores/settings"

export function WatchPage() {
  const { channelId } = useParams<{ channelId: string }>()
  const location = useLocation()
  const { index, meta, getChannel } = useCatalog()
  const player = usePlayer()
  const settings = useSettings()
  const setSettings = useSettings((s) => s.set)
  const anchorRef = React.useRef<HTMLDivElement | null>(null)

  const channel = getChannel(channelId)
  const isFav = useLibrary((s) => (channelId ? s.favorites.includes(channelId) : false))
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)

  /* keep the floating video surface glued to the reserved slot */
  React.useEffect(() => {
    player.setAnchor(anchorRef.current)
    return () => player.setAnchor(null)
  }, [channelId, player.setAnchor])

  /* start / switch playback */
  React.useEffect(() => {
    if (!channelId) return
    if (player.channel?.id === channelId) return
    const queue = (location.state as { q?: string[] } | null)?.q
    player.play(channelId, { queue })
  }, [channelId, location.state, player.channel?.id])

  const onChannelPage = player.mode === "theater"
  const focusOnItem = () =>
    (document.activeElement as HTMLElement | null)?.matches?.("[data-tv-item]") === true

  useHotkeys(
    {
      space: (event) => {
        event.preventDefault()
        player.togglePlay()
      },
      k: () => player.togglePlay(),
      m: () => player.toggleMute(),
      f: () => player.toggleFullscreen(),
      r: () => player.retry(),
      arrowleft: () => {
        if (focusOnItem()) return
        player.prevChannel()
      },
      arrowright: () => {
        if (focusOnItem()) return
        player.nextChannel()
      },
      arrowup: (event) => {
        if (focusOnItem()) return
        event.preventDefault()
        player.setVolume(Math.min(1, settings.volume + 0.1))
      },
      arrowdown: (event) => {
        if (focusOnItem()) return
        event.preventDefault()
        player.setVolume(Math.max(0, settings.volume - 0.1))
      },
    },
    { capture: true, enabled: Boolean(channel) && onChannelPage },
  )

  if (!channel) {
    return (
      <div className="mx-auto max-w-xl px-4 py-24 text-center">
        <Tv className="mx-auto size-7 text-muted-foreground" />
        <h1 className="mt-4 text-lg font-semibold">Channel not found</h1>
        <Button asChild className="mt-6" size="sm" variant="outline">
          <Link to="/browse">Browse channels</Link>
        </Button>
      </div>
    )
  }

  const country = countryInfo(channel.country, meta)
  const related = topBy(index.byCountry.get(channel.country) ?? [], channel.id)
  const sourceLabels = player.sources.map((source, i) => {
    const label = qualityLabel(source.quality) ?? `Source ${i + 1}`
    const shared = player.sources.some((other, j) => j !== i && (qualityLabel(other.quality) ?? "") === (qualityLabel(source.quality) ?? "") && qualityLabel(source.quality) !== null)
    return shared ? `${label} · ${i + 1}` : label
  })
  const activeSource = player.sources[player.sourceIndex] ?? null
  const activeWarnings = activeSource ? sourceWarnings(activeSource) : []

  return (
    <div className="pb-16">
      {/* theater */}
      <div className="border-b bg-zinc-950 pb-4 dark:bg-black">
        <div className="w-full px-0 sm:px-4 sm:pt-4">
          <div
            ref={anchorRef}
            className="relative aspect-video w-full overflow-hidden bg-black sm:rounded-xl sm:ring-1 sm:ring-white/10"
          >
            {/* placeholder — the real <video> is a fixed layer positioned exactly on top */}
            <div className="absolute inset-0 flex items-center justify-center text-white/40">
              <span className="flex items-center gap-2 text-sm">
                <Play className="size-4" /> Opening {channel.name}…
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="w-full space-y-8 px-4 py-6 sm:px-6">
        <div className="flex flex-wrap items-center gap-4">
          <ChannelLogo channel={channel} className="size-12 shrink-0 rounded-lg ring-1 ring-border" />
          <div className="min-w-0 flex-1">
            <h1 className="truncate text-lg font-semibold tracking-tight sm:text-xl">
              {channel.name}
            </h1>
            <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
              <span aria-hidden>{country.flag}</span>
              <Link
                to={`/browse?country=${channel.country}`}
                className="hover:text-foreground hover:underline"
              >
                {country.name}
              </Link>
              {channel.categories.map((id) => (
                <span key={id} className="flex items-center gap-2">
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <Link
                    to={`/browse?category=${id}`}
                    className="hover:text-foreground hover:underline"
                  >
                    {categoryName(id, meta)}
                  </Link>
                </span>
              ))}
            </p>
          </div>

          <Button
            variant={isFav ? "default" : "outline"}
            size="sm"
            className="gap-2"
            onClick={() => toggleFavorite(channel.id)}
            aria-pressed={isFav}
          >
            <Heart className={cn("size-4", isFav && "fill-current")} />
            {isFav ? "Favourited" : "Favourite"}
          </Button>
        </div>

        {player.sources.length > 1 ? (
          <section className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border bg-card px-3 py-2">
            <h2 className="text-xs font-medium text-muted-foreground">Sources</h2>
            <div className="flex flex-wrap items-center gap-1.5">
              {player.sources.map((source, i) => {
                const active = i === player.sourceIndex
                return (
                  <button
                    key={`${source.url}-${i}`}
                    type="button"
                    onClick={() => player.selectSource(i)}
                    aria-pressed={active}
                    title={hostnameOf(source.url)}
                    className={cn(
                      "h-7 rounded-full border px-2.5 text-xs font-medium transition-colors",
                      active
                        ? "border-primary/50 bg-primary/10 text-primary"
                        : "border-border bg-background text-muted-foreground hover:bg-accent hover:text-accent-foreground",
                    )}
                  >
                    {sourceLabels[i]}
                  </button>
                )
              })}
            </div>
            {activeSource ? (
              <span className="ml-auto flex min-w-0 items-center gap-1.5 text-[11px] text-muted-foreground">
                <span className="min-w-0 truncate font-mono">
                  {hostnameOf(activeSource.url)}
                  {activeWarnings.length ? (
                    <span className="text-amber-600 dark:text-amber-400"> · {activeWarnings[0]}</span>
                  ) : null}
                </span>
                <Button
                  size="icon"
                  variant="ghost"
                  className="size-6 shrink-0 text-muted-foreground"
                  aria-label="Copy stream URL"
                  onClick={() => {
                    void navigator.clipboard
                      ?.writeText(activeSource.url)
                      .then(() => toast.success("Stream URL copied"))
                      .catch(() => toast.error("Could not copy the URL"))
                  }}
                >
                  <Copy className="size-3.5" />
                </Button>
              </span>
            ) : null}
          </section>
        ) : null}

        {player.sources.length === 0 ? (
          <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
            No source for this channel can play in a browser.{" "}
            <button
              type="button"
              className="underline underline-offset-4 hover:text-foreground"
              onClick={() => setSettings({ hideHeaderOnly: false })}
            >
              Show header-only streams
            </button>
          </p>
        ) : null}

        {related.length ? (
          <ChannelRow
            title={`More from ${country.name}`}
            channels={related}
            action={
              <Button variant="ghost" size="sm" asChild className="h-7 text-xs">
                <Link to={`/browse?country=${channel.country}`}>See all</Link>
              </Button>
            }
          />
        ) : null}
      </div>
    </div>
  )
}

function topBy(channels: Channel[], excludeId: string, limit = 12): Channel[] {
  return channels
    .filter((c) => c.id !== excludeId && isPlayable(c))
    .sort((a, b) => popularity(b) - popularity(a))
    .slice(0, limit)
}
