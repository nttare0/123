import * as React from "react"
import { Compass, CornerDownLeft, Heart, Home, Moon, Settings2, Sun } from "lucide-react"
import { useTheme } from "next-themes"
import { useNavigate } from "react-router-dom"

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
import { searchChannels } from "@/lib/search"
import { useLibrary } from "@/stores/library"

interface CommandMenuProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onOpenSettings: () => void
}

export function CommandMenu({ open, onOpenChange, onOpenSettings }: CommandMenuProps) {
  const [query, setQuery] = React.useState("")
  const navigate = useNavigate()
  const { index, meta } = useCatalog()
  const { resolvedTheme, setTheme } = useTheme()
  const favorites = useLibrary((s) => s.favorites)

  React.useEffect(() => {
    if (!open) setQuery("")
  }, [open])

  const results = React.useMemo(
    () => (query.trim() ? searchChannels(index, query.trim(), 8) : []),
    [index, query],
  )

  const favouriteHits = React.useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return []
    return favorites
      .map((id) => index.byId.get(id))
      .filter((c): c is NonNullable<typeof c> => Boolean(c))
      .filter((c) => c.name.toLowerCase().includes(q))
      .slice(0, 4)
  }, [favorites, index.byId, query])

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
      description="Search channels or run a command."
      className="top-[20%] translate-y-0 sm:max-w-xl"
    >
      <CommandInput
        placeholder="Search channels…"
        value={query}
        onValueChange={setQuery}
      />
      <CommandList>
        <CommandEmpty>No channels found.</CommandEmpty>

        {results.length ? (
          <CommandGroup heading="Channels">
            {results.map((channel) => {
              const country = countryInfo(channel.country, meta)
              return (
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
                      {country.flag} {country.name}
                    </span>
                  </span>
                  <CommandShortcut>
                    <CornerDownLeft className="size-3" />
                  </CommandShortcut>
                </CommandItem>
              )
            })}
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

        <CommandSeparator />
        <CommandGroup heading="Navigate">
          <CommandItem value="nav-home" onSelect={() => go("/")}>
            <Home /> Home
          </CommandItem>
          <CommandItem value="nav-browse" onSelect={() => go("/browse")}>
            <Compass /> Browse
          </CommandItem>
          <CommandItem value="nav-favourites" onSelect={() => go("/favourites")}>
            <Heart /> Favourites
          </CommandItem>
        </CommandGroup>

        <CommandSeparator />
        <CommandGroup heading="Actions">
          <CommandItem
            value="action-theme"
            onSelect={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
          >
            {resolvedTheme === "dark" ? <Sun /> : <Moon />}
            {resolvedTheme === "dark" ? "Light theme" : "Dark theme"}
          </CommandItem>
          <CommandItem
            value="action-settings"
            onSelect={() => {
              onOpenChange(false)
              onOpenSettings()
            }}
          >
            <Settings2 /> Settings
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  )
}
