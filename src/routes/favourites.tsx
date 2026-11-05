import * as React from "react"
import { Compass, Heart, History } from "lucide-react"
import { Link, useSearchParams } from "react-router-dom"

import { ChannelGrid } from "@/components/channel/channel-grid"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useCatalog } from "@/lib/catalog"
import { timeAgo } from "@/lib/format"
import type { Channel } from "@/lib/iptv/types"
import { useLibrary } from "@/stores/library"

export function FavouritesPage() {
  const { index } = useCatalog()
  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)
  const removeRecent = useLibrary((s) => s.removeRecent)
  const clearRecents = useLibrary((s) => s.clearRecents)
  const [params, setParams] = useSearchParams()

  const tab = params.get("tab") === "history" ? "history" : "favourites"

  const favoriteChannels = React.useMemo(
    () => favorites.map((id) => index.byId.get(id)).filter((c): c is Channel => Boolean(c)),
    [favorites, index.byId],
  )

  const recentChannels = React.useMemo(
    () =>
      recents
        .map((entry) => {
          const channel = index.byId.get(entry.id)
          return channel ? { channel, at: entry.at } : null
        })
        .filter((entry): entry is { channel: Channel; at: number } => Boolean(entry)),
    [index.byId, recents],
  )

  return (
    <div className="mx-auto max-w-[110rem] px-4 py-6 sm:px-6">
      <header className="mb-5">
        <h1 className="text-xl font-semibold tracking-tight sm:text-2xl">Your library</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Favourites and watch history are stored in this browser only — nothing is uploaded.
        </p>
      </header>

      <Tabs
        value={tab}
        onValueChange={(value) => {
          const next = new URLSearchParams(params)
          if (value === "history") next.set("tab", "history")
          else next.delete("tab")
          setParams(next, { replace: true })
        }}
      >
        <TabsList>
          <TabsTrigger value="favourites" className="gap-2">
            <Heart className="size-4" /> Favourites
            <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] tabular-nums">
              {favorites.length}
            </span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="size-4" /> History
            <span className="ml-1 rounded-full bg-muted px-1.5 text-[11px] tabular-nums">
              {recents.length}
            </span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="favourites" className="mt-5">
          <ChannelGrid
            channels={favoriteChannels}
            emptyTitle="No favourites yet"
            emptyDescription="Tap the heart on any channel to keep it here. Favourites survive a restart because they are saved in this browser."
            emptyAction={
              <Button asChild className="gap-2">
                <Link to="/browse">
                  <Compass /> Find something to watch
                </Link>
              </Button>
            }
          />
        </TabsContent>

        <TabsContent value="history" className="mt-5 space-y-4">
          {recentChannels.length ? (
            <div className="flex justify-end">
              <Button variant="ghost" size="sm" onClick={clearRecents}>
                Clear history
              </Button>
            </div>
          ) : null}
          {recentChannels.length ? (
            <div className="space-y-1">
              {recentChannels.map(({ channel, at }) => (
                <div key={channel.id} className="group flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <Link
                      to={`/watch/${encodeURIComponent(channel.id)}`}
                      data-tv-item=""
                      className="flex items-center gap-3 rounded-lg p-2 transition-colors hover:bg-accent/60 focus-visible:ring-4 focus-visible:ring-ring/70 data-[tv-focused=true]:bg-accent data-[tv-focused=true]:ring-4 data-[tv-focused=true]:ring-ring/70"
                    >
                      <span className="min-w-0 flex-1 text-left">
                        <span className="block truncate text-sm font-medium">{channel.name}</span>
                        <span className="block text-xs text-muted-foreground">
                          {timeAgo(at)} · {channel.sources.length} sources
                        </span>
                      </span>
                    </Link>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="opacity-0 group-hover:opacity-100 focus-visible:opacity-100"
                    onClick={() => removeRecent(channel.id)}
                  >
                    Remove
                  </Button>
                </div>
              ))}
            </div>
          ) : (
            <ChannelGrid
              channels={[]}
              emptyTitle="Nothing watched yet"
              emptyDescription="Channels you open are listed here so you can jump straight back in."
              emptyAction={
                <Button asChild className="gap-2">
                  <Link to="/browse">
                    <Compass /> Browse channels
                  </Link>
                </Button>
              }
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
