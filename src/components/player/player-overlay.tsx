import { AlertTriangle, Copy, ExternalLink, Play, RotateCw, SkipForward, VolumeX } from "lucide-react"
import { toast } from "sonner"

import { usePlayer } from "@/components/player/player-context"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { hostnameOf } from "@/lib/format"
import { cn } from "@/lib/utils"
import { useSettings } from "@/stores/settings"

/** Centre-of-stage states: connecting, paused, blocked, failed, plus the stats readout. */
export function PlayerOverlay({ mode }: { mode: "theater" | "mini" | "hidden" }) {
  const player = usePlayer()
  const { channel, source, status, error, stats, blockedByPolicy, mutedByPolicy, sources } = player
  const showStats = useSettings((s) => s.showStats)
  const compact = mode !== "theater"

  if (!channel) return null

  const busy = status === "loading" || status === "buffering"

  return (
    <div className="pointer-events-none absolute inset-0 flex flex-col">
      {showStats && !compact && status !== "error" ? (
        <div className="absolute top-3 right-3 rounded-md bg-black/70 px-2.5 py-2 font-mono text-[11px] leading-relaxed text-white/85 backdrop-blur-sm">
          <div>{stats.width ? `${stats.width}×${stats.height}` : "—"}</div>
          <div>{stats.bitrate ? `${(stats.bitrate / 1_000_000).toFixed(2)} Mb/s` : "— Mb/s"}</div>
          <div>buffer {stats.bufferAhead.toFixed(1)}s</div>
          <div>
            dropped {stats.dropped}/{stats.total}
          </div>
          {stats.latency ? <div>latency {stats.latency.toFixed(1)}s</div> : null}
          <div className="mt-1 max-w-64 truncate text-white/50">
            {source ? hostnameOf(source.url) : ""}
          </div>
        </div>
      ) : null}

      {mutedByPolicy && status === "playing" ? (
        <div className="absolute bottom-20 left-1/2 -translate-x-1/2">
          <Button
            size="sm"
            variant="secondary"
            className="pointer-events-auto gap-2 bg-white/90 text-black hover:bg-white"
            onClick={player.unmute}
          >
            <VolumeX /> Tap to unmute
          </Button>
        </div>
      ) : null}

      {busy && !error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/55">
          <Spinner className={cn("text-primary", compact ? "size-6" : "size-10")} />
          {!compact ? (
            <div className="text-center">
              <p className="text-sm font-medium text-white">Connecting to {channel.name}</p>
              <p className="mt-1 max-w-sm truncate text-xs text-white/55">
                {source ? hostnameOf(source.url) : "waiting for a source…"}
              </p>
            </div>
          ) : null}
        </div>
      ) : null}

      {status === "paused" && !busy && !error ? (
        <button
          type="button"
          onClick={player.togglePlay}
          className={cn(
            "pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/35 transition-opacity",
            compact && "bg-transparent",
          )}
          aria-label={`Play ${channel.name}`}
        >
          <span
            className={cn(
              "flex items-center justify-center rounded-full bg-white/15 ring-1 ring-white/25 backdrop-blur-sm transition-transform hover:scale-105",
              compact ? "size-10" : "size-16",
            )}
          >
            <Play className={cn("fill-white text-white", compact ? "size-4" : "size-7")} />
          </span>
        </button>
      ) : null}

      {blockedByPolicy ? (
        <div className="absolute inset-0 flex items-center justify-center bg-black/70">
          <Button className="pointer-events-auto gap-2" onClick={player.togglePlay}>
            <Play /> Tap to play {channel.name}
          </Button>
        </div>
      ) : null}

      {status === "error" && error ? (
        <div className="pointer-events-auto absolute inset-0 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-md rounded-xl border border-white/10 bg-zinc-900/90 p-4 text-left shadow-2xl backdrop-blur">
            <div className="flex items-start gap-3">
              <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-destructive/15 text-destructive">
                <AlertTriangle className="size-5" />
              </span>
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white">{error.title}</p>
                <p className="mt-1 text-xs leading-relaxed text-white/60">{error.detail}</p>
                {source ? (
                  <p className="mt-2 truncate font-mono text-[11px] text-white/35">{source.url}</p>
                ) : null}
              </div>
            </div>

            {!compact ? (
              <div className="mt-4 flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" className="gap-2" onClick={player.retry}>
                  <RotateCw /> Retry
                </Button>
                {sources.length > 1 ? (
                  <Button size="sm" variant="secondary" className="gap-2" onClick={player.nextSource}>
                    <SkipForward /> Try another source
                    <Badge variant="outline" className="ml-1 border-white/20 text-white/70">
                      {sources.length}
                    </Badge>
                  </Button>
                ) : null}
                {source ? (
                  <>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => {
                        void navigator.clipboard
                          ?.writeText(source.url)
                          .then(() => toast.success("Stream URL copied"))
                          .catch(() => toast.error("Could not copy the URL"))
                      }}
                    >
                      <Copy /> Copy URL
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="gap-2 text-white/70 hover:bg-white/10 hover:text-white"
                      onClick={() => window.open(source.url, "_blank", "noopener,noreferrer")}
                    >
                      <ExternalLink /> Open raw
                    </Button>
                  </>
                ) : null}
              </div>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  )
}
