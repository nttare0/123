import * as React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"

import { ChannelCard } from "@/components/channel/channel-card"
import { Button } from "@/components/ui/button"
import type { Channel } from "@/lib/iptv/types"
import { cn } from "@/lib/utils"

interface ChannelRowProps {
  title: React.ReactNode
  subtitle?: React.ReactNode
  channels: Channel[]
  action?: React.ReactNode
  className?: string
  /** Narrower tiles for dense rows. */
  size?: "sm" | "md"
}

/** Horizontal, snap-scrolling carousel — the home screen building block. */
export function ChannelRow({
  title,
  subtitle,
  channels,
  action,
  className,
  size = "md",
}: ChannelRowProps) {
  const scroller = React.useRef<HTMLDivElement | null>(null)
  const [edges, setEdges] = React.useState({ start: true, end: false })

  const queue = React.useMemo(() => channels.map((c) => c.id), [channels])

  const measure = React.useCallback(() => {
    const el = scroller.current
    if (!el) return
    setEdges({
      start: el.scrollLeft <= 8,
      end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 8,
    })
  }, [])

  React.useEffect(() => {
    measure()
    const el = scroller.current
    if (!el) return
    el.addEventListener("scroll", measure, { passive: true })
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => {
      el.removeEventListener("scroll", measure)
      observer.disconnect()
    }
  }, [channels.length, measure])

  const nudge = (direction: -1 | 1) => {
    const el = scroller.current
    if (!el) return
    el.scrollBy({ left: direction * el.clientWidth * 0.85, behavior: "smooth" })
  }

  if (!channels.length) return null

  return (
    <section className={cn("space-y-3", className)}>
      <header className="flex items-end justify-between gap-3">
        <div className="min-w-0">
          <h2 className="truncate text-base font-semibold tracking-tight sm:text-lg">{title}</h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs text-muted-foreground">{subtitle}</p>
          ) : null}
        </div>
        <div className="flex shrink-0 items-center gap-1.5">
          {action}
          <div className="hidden items-center gap-1 sm:flex">
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              disabled={edges.start}
              onClick={() => nudge(-1)}
              aria-label="Scroll left"
            >
              <ChevronLeft />
            </Button>
            <Button
              type="button"
              size="icon"
              variant="outline"
              className="size-7"
              disabled={edges.end}
              onClick={() => nudge(1)}
              aria-label="Scroll right"
            >
              <ChevronRight />
            </Button>
          </div>
        </div>
      </header>

      <div
        ref={scroller}
        className="no-scrollbar -mx-4 flex snap-x snap-mandatory gap-3 overflow-x-auto px-4 pb-1 sm:-mx-6 sm:px-6"
      >
        {channels.map((channel) => (
          <ChannelCard
            key={channel.id}
            channel={channel}
            queue={queue}
            className={cn(
              "shrink-0 snap-start",
              size === "sm" ? "w-36 sm:w-40" : "w-44 sm:w-52",
            )}
          />
        ))}
      </div>
    </section>
  )
}
