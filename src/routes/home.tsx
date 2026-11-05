import * as React from "react"
import { ArrowRight, Compass, Heart, History, Radio, Search, Shuffle, Star } from "lucide-react"
import { Link, useNavigate, useOutletContext } from "react-router-dom"

import { ChannelRow } from "@/components/channel/channel-row"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Kbd } from "@/components/ui/kbd"
import type { LayoutContext } from "@/components/app-layout"
import { useCatalog } from "@/lib/catalog"
import {
  categoryIcon,
  countryInfo,
  EAST_AFRICA,
  FEATURED_CATEGORIES,
  isPlayable,
} from "@/lib/collections"
import { compactNumber } from "@/lib/format"
import type { Channel } from "@/lib/iptv/types"
import { filterChannels, popularity } from "@/lib/search"
import { useLibrary } from "@/stores/library"
import { resolveProtocol, useSettings } from "@/stores/settings"

interface Row {
  id: string
  title: React.ReactNode
  subtitle?: React.ReactNode
  action?: React.ReactNode
  channels: Channel[]
}

const ROW_LIMIT = 18

function topChannels(channels: Channel[], limit = ROW_LIMIT): Channel[] {
  return [...channels]
    .filter(isPlayable)
    .sort((a, b) => popularity(b) - popularity(a))
    .slice(0, limit)
}

export function HomePage() {
  const { index, meta } = useCatalog()
  const settings = useSettings()
  const navigate = useNavigate()
  const layout = useOutletContext<LayoutContext>()
  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)
  const custom = useLibrary((s) => s.custom)

  const homeCountry = settings.homeCountry || "RW"
  const country = countryInfo(homeCountry, meta)

  const rows = React.useMemo<Row[]>(() => {
    const built: Row[] = []

    const recent = recents
      .map((entry) => index.byId.get(entry.id))
      .filter((c): c is Channel => Boolean(c))
      .slice(0, ROW_LIMIT)
    if (recent.length) {
      built.push({
        id: "recent",
        title: (
          <span className="flex items-center gap-2">
            <History className="size-4 text-muted-foreground" /> Continue watching
          </span>
        ),
        subtitle: "Pick up where you left off",
        action: (
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link to="/favourites?tab=history">See all</Link>
          </Button>
        ),
        channels: recent,
      })
    }

    const favs = favorites
      .map((id) => index.byId.get(id))
      .filter((c): c is Channel => Boolean(c))
      .slice(0, ROW_LIMIT)
    if (favs.length) {
      built.push({
        id: "favourites",
        title: (
          <span className="flex items-center gap-2">
            <Heart className="size-4 fill-red-500 text-red-500" /> Your favourites
          </span>
        ),
        subtitle: `${favorites.length} saved on this device`,
        action: (
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link to="/favourites">See all</Link>
          </Button>
        ),
        channels: favs,
      })
    }

    if (custom.length) {
      built.push({
        id: "custom",
        title: (
          <span className="flex items-center gap-2">
            <Radio className="size-4 text-muted-foreground" /> My streams
          </span>
        ),
        subtitle: "Playlists you added yourself",
        action: (
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link to="/my-streams">Manage</Link>
          </Button>
        ),
        channels: custom
          .map((entry) => index.byId.get(entry.id))
          .filter((c): c is Channel => Boolean(c)),
      })
    }

    const national = index.byCountry.get(homeCountry) ?? []
    if (national.length) {
      built.push({
        id: "country",
        title: (
          <span className="flex items-center gap-2">
            <span aria-hidden>{country.flag}</span> {country.name}
          </span>
        ),
        subtitle: `${national.length} channels broadcasting from ${country.name}`,
        action: (
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link to={`/browse?country=${homeCountry}`}>See all</Link>
          </Button>
        ),
        channels: topChannels(national),
      })
    }

    const regional = index.channels.filter((c) => EAST_AFRICA.includes(c.country))
    if (regional.length) {
      built.push({
        id: "east-africa",
        title: (
          <span className="flex items-center gap-2">
            <Star className="size-4 text-muted-foreground" /> East &amp; Great Lakes Africa
          </span>
        ),
        subtitle: "Rwanda · Uganda · Tanzania · Kenya · Burundi · DR Congo and neighbours",
        action: (
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link to="/browse?region=EAST">See all</Link>
          </Button>
        ),
        channels: topChannels(regional, 24),
      })
    }

    for (const category of FEATURED_CATEGORIES) {
      const list = index.byCategory.get(category)
      if (!list?.length) continue
      const Icon = categoryIcon(category)
      const name = meta.categories.find((c) => c.id === category)?.name ?? category
      built.push({
        id: `cat-${category}`,
        title: (
          <span className="flex items-center gap-2">
            <Icon className="size-4 text-muted-foreground" /> {name}
          </span>
        ),
        subtitle: `${compactNumber(list.length)} channels worldwide`,
        action: (
          <Button variant="ghost" size="sm" asChild className="h-7 gap-1 text-xs">
            <Link to={`/browse?category=${category}`}>See all</Link>
          </Button>
        ),
        channels: topChannels(list),
      })
    }

    const bestConnected = topChannels(
      index.channels.filter((c) => c.sources.length >= 4),
      ROW_LIMIT,
    )
    if (bestConnected.length) {
      built.push({
        id: "mirrors",
        title: "Best connected",
        subtitle: "Channels with several mirrors — the player fails over automatically",
        channels: bestConnected,
      })
    }

    return built
  }, [custom, country.flag, country.name, favorites, favorites.length, homeCountry, index, meta.categories, recents])

  const stats = React.useMemo(
    () => [
      { label: "Channels", value: index.channels.length.toLocaleString() },
      { label: "Stream sources", value: index.totalSources.toLocaleString() },
      { label: "Countries", value: String(index.countryCounts.size) },
      { label: "Categories", value: String(index.categoryCounts.size) },
    ],
    [index],
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
    const pool = channels.slice(0, 400)
    if (!pool.length) return
    const pick = pool[Math.floor(Math.random() * pool.length)]
    navigate(`/watch/${encodeURIComponent(pick.id)}`)
  }, [index, meta, navigate, settings.hideGeoBlocked, settings.hideHeaderOnly, settings.protocol])

  return (
    <div className="pb-20">
      {/* hero */}
      <section className="relative overflow-hidden border-b bg-muted/25">
        <div
          className="pointer-events-none absolute inset-0 opacity-70"
          style={{
            backgroundImage:
              "radial-gradient(60rem 30rem at 15% -10%, color-mix(in oklab, var(--primary) 20%, transparent), transparent 60%), radial-gradient(40rem 24rem at 90% 0%, color-mix(in oklab, var(--success) 14%, transparent), transparent 60%)",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-6xl px-4 py-9 sm:px-6 sm:py-12">
          <Badge variant="secondary" className="gap-1.5 border-transparent bg-red-600/15 text-red-600 dark:text-red-400">
            <span className="size-1.5 animate-live-pulse rounded-full bg-red-500" />
            Live · free-to-air · iptv-org
          </Badge>

          <h1 className="mt-4 max-w-3xl text-balance text-3xl font-bold tracking-tight sm:text-4xl">
            {index.channels.length.toLocaleString()} TV channels from{" "}
            <span className="text-primary">{index.countryCounts.size} countries</span>, playing
            right in your browser.
          </h1>
          <p className="mt-3 max-w-2xl text-pretty text-sm leading-relaxed text-muted-foreground sm:text-base">
            Every stream comes from the community-maintained{" "}
            <a
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noreferrer noopener"
              className="underline underline-offset-4 hover:text-foreground"
            >
              iptv-org
            </a>{" "}
            catalog and plays through hls.js — no plug-in, no set-top box, no sign-up. Built with
            shadcn/ui, and designed to work with a mouse, a keyboard or a TV remote.
          </p>

          <div className="mt-6 flex flex-wrap items-center gap-2">
            <Button asChild size="lg" className="gap-2">
              <Link to="/browse">
                <Compass /> Browse channels
              </Link>
            </Button>
            <Button variant="outline" size="lg" className="gap-2" onClick={playRandom}>
              <Shuffle /> Surprise me
            </Button>
            <Button variant="ghost" size="lg" className="gap-2" onClick={layout.openSearch}>
              <Search /> Search
              <Kbd>Ctrl K</Kbd>
            </Button>
          </div>

          <dl className="mt-8 grid max-w-2xl grid-cols-2 gap-3 sm:grid-cols-4">
            {stats.map((stat) => (
              <div key={stat.label} className="rounded-lg border bg-background/60 px-3 py-2 backdrop-blur-sm">
                <dt className="text-[11px] tracking-wide text-muted-foreground uppercase">
                  {stat.label}
                </dt>
                <dd className="text-lg font-semibold tabular-nums">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* rows */}
      <div className="mx-auto max-w-[110rem] space-y-9 px-4 pt-8 sm:px-6">
        {rows.map((row) => (
          <ChannelRow
            key={row.id}
            title={row.title}
            subtitle={row.subtitle}
            action={row.action}
            channels={row.channels}
          />
        ))}

        <footer className="border-t pt-6 text-xs text-muted-foreground">
          <p>
            Channel data, logos and stream URLs are published by the{" "}
            <a
              className="underline underline-offset-4 hover:text-foreground"
              href="https://github.com/iptv-org/iptv"
              target="_blank"
              rel="noreferrer noopener"
            >
              iptv-org
            </a>{" "}
            project under CC0. Live TV Hub does not host any stream; playback depends on each
            broadcaster allowing browser access. Arrow through the rows with a keyboard or TV
            remote — press <Kbd>?</Kbd> for every shortcut.
          </p>
          <Button variant="ghost" size="sm" className="mt-3 gap-2 px-0 text-xs" asChild>
            <Link to="/browse">
              <ArrowRight /> Open the full catalog
            </Link>
          </Button>
        </footer>
      </div>
    </div>
  )
}
