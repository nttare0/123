import * as React from "react"
import { Link } from "react-router-dom"
import { toast } from "sonner"

import { ChannelGrid } from "@/components/channel/channel-grid"
import { ChannelRow } from "@/components/channel/channel-row"
import { Button } from "@/components/ui/button"
import { useCatalog } from "@/lib/catalog"
import type { Channel } from "@/lib/iptv/types"
import { useLibrary } from "@/stores/library"

export function FavouritesPage() {
  const { index } = useCatalog()
  const favorites = useLibrary((s) => s.favorites)
  const recents = useLibrary((s) => s.recents)
  const clearFavorites = useLibrary((s) => s.clearFavorites)
  const clearRecents = useLibrary((s) => s.clearRecents)

  const favouriteChannels = React.useMemo(
    () =>
      favorites
        .map((id) => index.byId.get(id))
        .filter((channel): channel is Channel => Boolean(channel)),
    [favorites, index.byId],
  )

  const recentChannels = React.useMemo(
    () =>
      recents
        .map((entry) => index.byId.get(entry.id))
        .filter((channel): channel is Channel => Boolean(channel))
        .slice(0, 18),
    [index.byId, recents],
  )

  return (
    <div className="w-full min-w-0 space-y-9 px-4 py-6 sm:px-6 lg:px-10">
      <div className="space-y-4">
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h1 className="text-lg font-semibold tracking-tight sm:text-xl">
            Favourites
            {favouriteChannels.length ? (
              <span className="ml-2 text-xs font-normal text-muted-foreground tabular-nums">
                {favouriteChannels.length}
              </span>
            ) : null}
          </h1>
          {favouriteChannels.length ? (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                clearFavorites()
                toast.success("Favourites cleared")
              }}
            >
              Clear all
            </Button>
          ) : null}
        </div>

        <ChannelGrid
          channels={favouriteChannels}
          pageSize={60}
          emptyTitle="No favourites yet"
          emptyDescription="Tap the heart on any channel to keep it here."
          emptyAction={
            <Button asChild variant="outline" size="sm">
              <Link to="/browse">Browse channels</Link>
            </Button>
          }
        />
      </div>

      {recentChannels.length ? (
        <ChannelRow
          title="Recently watched"
          channels={recentChannels}
          size="sm"
          action={
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs text-muted-foreground"
              onClick={() => {
                clearRecents()
                toast.success("History cleared")
              }}
            >
              Clear
            </Button>
          }
        />
      ) : null}
    </div>
  )
}
