import * as React from "react"
import {
  AlertTriangle,
  Check,
  Copy,
  ExternalLink,
  Globe2,
  Heart,
  Languages,
  Link2,
  ListVideo,
  Play,
  Radio,
  ShieldAlert,
  Timer,
} from "lucide-react"
import { Link, useLocation, useParams } from "react-router-dom"
import { toast } from "sonner"

import { ChannelLogo } from "@/components/channel/channel-logo"
import { ChannelRow } from "@/components/channel/channel-row"
import { usePlayer } from "@/components/player/player-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { useHotkeys } from "@/hooks/use-hotkeys"
import { useCatalog } from "@/lib/catalog"
import { categoryName, countryInfo, isPlayable, languageName } from "@/lib/collections"
import { hostnameOf, qualityLabel } from "@/lib/format"
import type { Channel } from "@/lib/iptv/types"
import { popularity } from "@/lib/search"
import { sourceWarnings } from "@/lib/playback"
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

  React.useEffect(() => {
    if (!channel) return
    document.title = `${channel.name} · Live TV Hub`
    return () => {
      document.title = "Live TV Hub — Free live TV from around the world"
    }
  }, [channel])

  const onChannelPage = player.mode === "theater"
  const focusOnItem = () =>
    (document.activeElement as HTMLElement | null)?.matches?.("[data-tv-item]") === true

  useHotkeys(
    {
      space: (e) => {
        e.preventDefault()
        player.togglePlay()
      },
      k: () => player.togglePlay(),
      m: () => player.toggleMute(),
      f: () => player.toggleFullscreen(),
      p: () => void player.togglePip(),
      r: () => player.retry(),
      n: () => player.nextSource(),
      s: () => setSettings({ showStats: !settings.showStats }),
      arrowleft: () => {
        if (focusOnItem()) return
        player.prevChannel()
      },
      arrowright: () => {
        if (focusOnItem()) return
        player.nextChannel()
      },
      arrowup: (e) => {
        if (focusOnItem()) return
        e.preventDefault()
        player.setVolume(Math.min(1, settings.volume + 0.1))
      },
      arrowdown: (e) => {
        if (focusOnItem()) return
        e.preventDefault()
        player.setVolume(Math.max(0, settings.volume - 0.1))
      },
    },
    { capture: true, enabled: Boolean(channel) && onChannelPage },
  )

  if (!channel) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-24 text-center">
        <Radio className="mx-auto size-8 text-muted-foreground" />
        <h1 className="mt-4 text-xl font-semibold">Channel not found</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          “{channelId}” is not in the current catalog snapshot. It may have been removed upstream.
        </p>
        <Button asChild className="mt-6">
          <Link to="/browse">Browse all channels</Link>
        </Button>
      </div>
    )
  }

  const country = countryInfo(channel.country, meta)
  const relatedCountry = topBy(index.byCountry.get(channel.country) ?? [], channel.id)
  const relatedCategory = channel.categories.length
    ? topBy(index.byCategory.get(channel.categories[0]) ?? [], channel.id, 18)
    : []
  const hiddenSources = channel.sources.length - player.sources.length

  return (
    <div className="pb-20">
      {/* theater */}
      <div className="border-b bg-zinc-950 pb-4 dark:bg-black">
        <div className="mx-auto w-full max-w-[110rem] px-0 sm:px-4 sm:pt-4">
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

      <div className="mx-auto max-w-[110rem] space-y-8 px-4 py-6 sm:px-6">
        {/* headline */}
        <div className="flex flex-wrap items-start gap-4">
          <ChannelLogo
            channel={channel}
            className="size-16 shrink-0 rounded-xl ring-1 ring-border sm:size-20"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">{channel.name}</h1>
              <Badge variant="secondary" className="gap-1.5">
                <span className="size-1.5 animate-live-pulse rounded-full bg-red-500" />
                Live
              </Badge>
              {channel.sources[0]?.quality ? (
                <Badge variant="outline">{qualityLabel(channel.sources[0].quality)}</Badge>
              ) : null}
            </div>

            <p className="mt-1.5 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-muted-foreground">
              <span className="flex items-center gap-1.5">
                <span aria-hidden>{country.flag}</span>
                <Link
                  to={`/browse?country=${channel.country}`}
                  className="hover:text-foreground hover:underline"
                >
                  {country.name}
                </Link>
              </span>
              {channel.categories.map((id) => (
                <span key={id} className="flex items-center gap-1.5">
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <Link to={`/browse?category=${id}`} className="hover:text-foreground hover:underline">
                    {categoryName(id, meta)}
                  </Link>
                </span>
              ))}
              {channel.languages.length ? (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  <Languages className="size-3.5" />
                  {channel.languages.map((code) => languageName(code, meta)).join(", ")}
                </span>
              ) : null}
              {channel.network ? (
                <span className="flex items-center gap-1.5">
                  <span aria-hidden className="opacity-40">
                    ·
                  </span>
                  {channel.network}
                </span>
              ) : null}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Button
              variant={isFav ? "default" : "outline"}
              className="gap-2"
              onClick={() => toggleFavorite(channel.id)}
              aria-pressed={isFav}
            >
              <Heart className={cn("size-4", isFav && "fill-current")} />
              {isFav ? "Favourited" : "Favourite"}
            </Button>
            <Button
              variant="outline"
              className="gap-2"
              onClick={() => {
                void navigator.clipboard
                  ?.writeText(window.location.href)
                  .then(() => toast.success("Link copied"))
                  .catch(() => toast.error("Could not copy the link"))
              }}
            >
              <Link2 /> Share
            </Button>
            {channel.website ? (
              <Button variant="ghost" className="gap-2" asChild>
                <a href={channel.website} target="_blank" rel="noreferrer noopener">
                  <ExternalLink /> Website
                </a>
              </Button>
            ) : null}
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
          {/* sources */}
          <Card id="details">
            <CardHeader className="flex-row items-center justify-between gap-2 space-y-0">
              <CardTitle className="flex items-center gap-2 text-base">
                <ListVideo className="size-4 text-muted-foreground" />
                Stream sources
                <Badge variant="secondary">{player.sources.length}</Badge>
              </CardTitle>
              <span className="text-xs text-muted-foreground">
                {player.status === "playing"
                  ? "Playing"
                  : player.status === "error"
                    ? "Failed"
                    : "Loading"}{" "}
                · source {player.sourceIndex + 1}/{player.sources.length}
              </span>
            </CardHeader>
            <CardContent className="space-y-2">
              {player.sources.length === 0 ? (
                <p className="rounded-lg border border-dashed p-4 text-sm text-muted-foreground">
                  Every source for this channel is excluded by your playback filters.{" "}
                  <button
                    type="button"
                    className="underline underline-offset-4 hover:text-foreground"
                    onClick={() =>
                      setSettings({ hideGeoBlocked: false, hideNot247: false, hideHeaderOnly: false })
                    }
                  >
                    Relax the filters
                  </button>
                  .
                </p>
              ) : null}

              {player.sources.map((source, i) => {
                const warnings = sourceWarnings(source)
                const active = i === player.sourceIndex
                return (
                  <div
                    key={`${source.url}-${i}`}
                    className={cn(
                      "flex flex-wrap items-center gap-3 rounded-lg border p-3 transition-colors",
                      active ? "border-primary/50 bg-primary/5" : "bg-card hover:bg-accent/50",
                    )}
                  >
                    <Button
                      size="sm"
                      variant={active ? "default" : "outline"}
                      className="gap-2"
                      onClick={() => player.selectSource(i)}
                    >
                      {active ? <Check /> : <Play />}
                      {active ? "Playing" : "Play"}
                    </Button>

                    <div className="min-w-0 flex-1">
                      <p className="flex flex-wrap items-center gap-1.5 text-sm font-medium">
                        Source {i + 1}
                        {source.quality ? (
                          <Badge variant="outline">{qualityLabel(source.quality)}</Badge>
                        ) : null}
                        {warnings.includes("Possibly geo-blocked") ? (
                          <Badge variant="secondary" className="gap-1 text-amber-600 dark:text-amber-400">
                            <ShieldAlert className="size-3" /> geo
                          </Badge>
                        ) : null}
                        {warnings.includes("Not broadcasting 24/7") ? (
                          <Badge variant="secondary" className="gap-1">
                            <Timer className="size-3" /> part-time
                          </Badge>
                        ) : null}
                      </p>
                      <p className="mt-1 truncate font-mono text-[11px] text-muted-foreground">
                        {hostnameOf(source.url)}
                        <span className="hidden sm:inline"> — {source.url}</span>
                      </p>
                      {warnings.length ? (
                        <p className="mt-1 flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400">
                          <AlertTriangle className="size-3 shrink-0" />
                          {warnings.join(" · ")}
                        </p>
                      ) : null}
                    </div>

                    <div className="flex items-center gap-1">
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label="Copy stream URL"
                        onClick={() => {
                          void navigator.clipboard
                            ?.writeText(source.url)
                            .then(() => toast.success("Stream URL copied"))
                            .catch(() => toast.error("Could not copy the URL"))
                        }}
                      >
                        <Copy />
                      </Button>
                      <Button
                        size="icon"
                        variant="ghost"
                        className="size-8"
                        aria-label="Open stream URL in a new tab"
                        onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")}
                      >
                        <ExternalLink />
                      </Button>
                    </div>
                  </div>
                )
              })}

              {hiddenSources > 0 ? (
                <p className="pt-1 text-xs text-muted-foreground">
                  {hiddenSources} more {hiddenSources === 1 ? "source" : "sources"} hidden by your
                  playback filters.
                </p>
              ) : null}

              <Separator className="my-3" />

              <dl className="grid grid-cols-2 gap-3 text-xs sm:grid-cols-4">
                <div>
                  <dt className="text-muted-foreground">Channel ID</dt>
                  <dd className="mt-0.5 truncate font-mono">{channel.id}</dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Country</dt>
                  <dd className="mt-0.5">
                    {country.flag} {country.name}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Languages</dt>
                  <dd className="mt-0.5">
                    {channel.languages.length
                      ? channel.languages.map((c) => languageName(c, meta)).join(", ")
                      : "—"}
                  </dd>
                </div>
                <div>
                  <dt className="text-muted-foreground">Upstream</dt>
                  <dd className="mt-0.5">
                    <a
                      className="inline-flex items-center gap-1 hover:underline"
                      href={`https://github.com/iptv-org/iptv/blob/master/streams/${channel.country.toLowerCase()}.m3u`}
                      target="_blank"
                      rel="noreferrer noopener"
                    >
                      <Globe2 className="size-3" /> {channel.country.toLowerCase()}.m3u
                    </a>
                  </dd>
                </div>
              </dl>

              {channel.altNames?.length ? (
                <p className="text-xs text-muted-foreground">
                  Also known as: {channel.altNames.join(", ")}
                </p>
              ) : null}
            </CardContent>
          </Card>

          {/* side notes */}
          <div className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Good to know</CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-xs leading-relaxed text-muted-foreground">
                <p>
                  Streams are contributed by the iptv-org community and can stop working at any
                  time. If one fails, the player automatically tries the next mirror
                  {settings.autoFailover ? "" : " (auto-failover is off in Settings)"}.
                </p>
                <p>
                  Broadcasters that refuse cross-origin browser requests cannot be played here —
                  that is a limitation of the web platform, not of Live TV Hub.
                </p>
                <p className="flex items-start gap-2">
                  <kbd className="rounded border bg-muted px-1.5 py-0.5 font-sans text-[10px]">?</kbd>
                  <span>Keyboard and TV-remote shortcuts</span>
                </p>
              </CardContent>
            </Card>
          </div>
        </div>

        {relatedCountry.length ? (
          <ChannelRow
            title={`More from ${country.name}`}
            subtitle={`${country.flag} ${index.countryCounts.get(channel.country) ?? 0} channels in the catalog`}
            channels={relatedCountry}
            action={
              <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                <Link to={`/browse?country=${channel.country}`}>See all</Link>
              </Button>
            }
          />
        ) : null}

        {relatedCategory.length ? (
          <ChannelRow
            title={`More ${categoryName(channel.categories[0], meta).toLowerCase()} channels`}
            channels={relatedCategory}
            action={
              <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
                <Link to={`/browse?category=${channel.categories[0]}`}>See all</Link>
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
