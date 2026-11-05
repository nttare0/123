import * as React from "react"
import {
  Compass,
  CornerDownLeft,
  Heart,
  Monitor,
  Moon,
  Radio,
  RefreshCw,
  Settings2,
  Shuffle,
  Sun,
} from "lucide-react"
import { useTheme } from "next-themes"
import { useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { ChannelLogo } from "@/components/channel/channel-logo"
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
  CommandShortcut,
} from "@/components/ui/command"
import { useCatalog } from "@/lib/catalog"
import { countryInfo } from "@/lib/collections"
import { filterChannels, searchChannels } from "@/lib/search"
import { resolveProtocol, useSettings } from "@/stores/settings"
import { useLibrary } from "@/stores/library"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings: () => void
}

export function CommandMenu({ open, onOpenChange, onOpenSettings }: CommandMenuProps) {
  const [query, setQuery] = React.useState("")
  const navigate = useNavigate()
  const { index, meta, sync, syncing } = useCatalog()
  const settings = useSettings()
  const { setTheme } = useTheme()
  const favorites = useLibrary((s) => s.favorites)

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = React.useMemo(() => {
    const q = query.trim()
    if (!q) return []
    return searchChannels(index, q, 8)
  }, [index, query])

  const favouriteHits = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return favorites
      .map((id) => index.byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 4)
  }, [favorites, index.byId, query])

  const suggested = React.useMemo(() => {
    if (query.trim()) return []
    const { channels } = filterChannels(
      index,
      {
        countries: settings.homeCountry ? [settings.homeCountry] : undefined,
        protocol: resolveProtocol(settings.protocol),
        hideHeaderOnly: settings.hideHeaderOnly,
        sort: "relevance",
      },
      meta,
    )
    return channels.slice(0, 5)
  }, [index, meta, query, settings.hideHeaderOnly, settings.homeCountry, settings.protocol])

  const go = React.useCallback(
    (path: string) => {
      onOpenChange(false)
      navigate(path)
    },
    [navigate, onOpenChange],
  )

  const playChannel = React.useCallback(
    (id: string, queue: string[]) => {
      onOpenChange(false)
      navigate(`/watch/${encodeURIComponent(id)}`, { state: { q: queue.slice(0, 300) } })
    },
    [navigate, onOpenChange],
  )

  const resultQueue = React.useMemo(() => results.map((c) => c.id), [results])

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Search Live TV Hub"
      description="Search channels, countries and categories, or run a command."
      className="top-[20%] translate-y-0 sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search 10,000+ channels, countries, categories…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No channels found. Try a country, a category or a shorter term.</CommandEmpty>

        {results.length ? (
          <CommandGroup heading={`Channels · ${results.length} best matches`}>
            {results.map((channel) => (
              <CommandItem
                key={channel.id}
                value={`channel-${channel.id}`}
                onSelect={() => playChannel(channel.id, resultQueue)}
                className="gap-3"
              >
                <ChannelLogo channel={channel} className="size-8 shrink-0 rounded" />
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-medium">{channel.name}</span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {countryInfo(channel.country, meta).flag}{" "}
                    {countryInfo(channel.country, meta).name} ·{" "}
                    {channel.sources.length} {channel.sources.length === 1 ? "source" : "sources"}
                  </span>
                </span>
                <CommandShortcut>
                  <CornerDownLeft className="size-3" />
                </CommandShortcut>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        {favouriteHits.length ? (
          <>
            <CommandSeparator />
            <CommandGroup heading="Favourites">
              {favouriteHits.map((channel) => (
                <CommandItem
                  key={`fav-${channel.id}`}
                  value={`fav-${channel.id}`}
                  onSelect={() => playChannel(channel.id, favouriteHits.map((c) => c.id))}
                  className="gap-3"
                >
                  <Heart className="size-4 fill-red-500 text-red-500" />
                  <span className="truncate">{channel.name}</span>
                </CommandItem>
              ))}
            </CommandGroup>
          </>
        ) : null}

        {suggested.length ? (
          <CommandGroup heading={`Popular in ${countryInfo(settings.homeCountry, meta).name}`}>
            {suggested.map((channel) => (
              <CommandItem
                key={`sug-${channel.id}`}
                value={`sug-${channel.id}`}
                onSelect={() => playChannel(channel.id, suggested.map((c) => c.id))}
                className="gap-3"
              >
                <ChannelLogo channel={channel} className="size-6 shrink-0 rounded" />
                <span className="truncate">{channel.name}</span>
              </CommandItem>
            ))}
          </CommandGroup>
        ) : null}

        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem value="nav-home" onSelect={() => go("/")}>
            <Radio /> Home
          </CommandItem>
          <CommandItem value="nav-browse" onSelect={() => go("/browse")}>
            <Compass /> Browse every channel
            <CommandShortcut>B</CommandShortcut>
          </CommandItem>
          <CommandItem value="nav-favourites" onSelect={() => go("/favourites")}>
            <Heart /> Favourites
            <CommandShortcut>F</CommandShortcut>
          </CommandItem>
          <CommandItem value="nav-mystreams" onSelect={() => go("/my-streams")}>
            <Radio /> My streams
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="action-random"
            onSelect={() => {
              const pool = results.length ? results : index.channels.slice(0, 500)
              const pick = pool[Math.floor(Math.random() * pool.length)]
              if (pick) playChannel(pick.id, pool.map((c) => c.id))
            }}
          >
            <Shuffle /> Play something random
          </CommandItem>
          <CommandItem value="action-theme-light" onSelect={() => setTheme("light")}>
            <Sun /> Light theme
          </CommandItem>
          <CommandItem value="action-theme-dark" onSelect={() => setTheme("dark")}>
            <Moon /> Dark theme
          </CommandItem>
          <CommandItem value="action-theme-system" onSelect={() => setTheme("system")}>
            <Monitor /> Match system theme
          </CommandItem>
          <CommandItem
            value="action-settings"
            onSelect={() => {
              onOpenChange(false)
              onOpenSettings()
            }}
          >
            <Settings2 /> Playback settings
          </CommandItem>
          <CommandItem
            value="action-sync"
            disabled={syncing}
            onSelect={() => {
              onOpenChange(false)
              toast.promise(sync(), {
                loading: "Syncing the iptv-org catalog…",
                success: (n) => `Catalog synced — ${n.toLocaleString()} channels`,
                error: "Could not reach iptv-org. The bundled snapshot is still in use.",
              })
            }}
          >
            <RefreshCw className={syncing ? "animate-spin" : undefined} />
            Sync latest catalog
            <CommandShortcut>~18 MB</CommandShortcut>
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
