import * as React from "react"
import { SearchX } from "lucide-react"

import { ChannelCard } from "@/components/channel/channel-card"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { usePaged } from "@/hooks/use-paged"
import type { Channel } from "@/lib/iptv/types"
import { cn } from "@/lib/utils"

interface ChannelGridProps {
  channels: Channel[]
  pageSize?: number
  className?: string
  emptyTitle?: string
  emptyDescription?: string
  emptyAction?: React.ReactNode
}

export function ChannelGrid({
  channels,
  pageSize = 60,
  className,
  emptyTitle = "No channels match",
  emptyDescription = "Try a different search term or country.",
  emptyAction,
}: ChannelGridProps) {
  const { visible, hasMore, sentinelRef, shown, total, loadMore } = usePaged(channels, pageSize)
  const queue = React.useMemo(() => channels.map((c) => c.id), [channels])

  if (!channels.length) {
    return (
      <Empty className={cn("border py-16", className)}>
        <EmptyHeader>
          <EmptyMedia variant="icon">
            <SearchX />
          </EmptyMedia>
          <EmptyTitle>{emptyTitle}</EmptyTitle>
          <EmptyDescription>{emptyDescription}</EmptyDescription>
        </EmptyHeader>
        {emptyAction ? <EmptyContent>{emptyAction}</EmptyContent> : null}
      </Empty>
    )
  }

  return (
    <div className={className}>
      <div className="grid grid-cols-2 gap-x-3 gap-y-5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6">
        {visible.map((channel) => (
          <ChannelCard key={channel.id} channel={channel} queue={queue} />
        ))}
      </div>

      <div ref={sentinelRef} aria-hidden className="h-px w-full" />

      {hasMore ? (
        <div className="mt-6 flex items-center justify-between gap-4 text-xs text-muted-foreground">
          <span>
            <span className="font-medium text-foreground">{shown.toLocaleString()}</span> of{" "}
            <span className="font-medium text-foreground">{total.toLocaleString()}</span>
          </span>
          <Button variant="outline" size="sm" onClick={loadMore} data-tv-item="">
            Load more
          </Button>
        </div>
      ) : null}
    </div>
  )
}
