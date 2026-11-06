import { AlertTriangle, Play, Volume2 } from "lucide-react"

import { usePlayer } from "@/components/player/player-context"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { cn } from "@/lib/utils"

export function PlayerOverlay({
  mode,
  idle,
  onWake,
}: {
  mode: "theater" | "mini" | "hidden"
  idle: boolean
  onWake: () => void
}) {
  const { channel, status, error, blockedByPolicy, mutedByPolicy, unmute, togglePlay, retry, stop } =
    usePlayer()
  if (!channel || mode === "hidden") return null

  const loading = status === "loading" || status === "buffering" || status === "idle"
  const faded = cn("transition-opacity duration-300", idle && mode === "theater" && "opacity-0")

  return (
    <div className={cn("pointer-events-none absolute inset-0", faded)} onPointerMove={onWake}>
      {error ? (
        <div className="pointer-events-auto absolute inset-0 flex flex-col items-center justify-center gap-3 bg-black/80 px-6 text-center">
          <AlertTriangle className="size-7 text-amber-400" aria-hidden />
          <div>
            <p className="text-sm font-medium text-white">{error.title}</p>
            <p className="mx-auto mt-1 max-w-64 text-xs leading-relaxed text-white/60">
              {error.detail}
            </p>
          </div>
          <div className="mt-1 flex gap-2">
            <Button
              size="sm"
              variant="outline"
              className="border-white/25 bg-white/10 text-white hover:bg-white/20"
              onClick={retry}
            >
              Retry
            </Button>
            {mode === "mini" ? (
              <Button
                size="sm"
                variant="ghost"
                className="text-white/70 hover:bg-white/15 hover:text-white"
                onClick={stop}
              >
                Close
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {loading && !error ? (
        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
          <Spinner className="size-6 text-white/70" />
          <p className="text-[11px] tracking-wider text-white/60 uppercase">Connecting</p>
        </div>
      ) : null}

      {!loading && !error && status === "paused" ? (
        <button
          type="button"
          onClick={togglePlay}
          aria-label="Play"
          className="pointer-events-auto absolute inset-0 flex items-center justify-center"
        >
          <span className="flex size-14 items-center justify-center rounded-full bg-black/55 text-white backdrop-blur-sm">
            <Play className="size-6 translate-x-px" />
          </span>
        </button>
      ) : null}

      {blockedByPolicy && !error ? (
        <div className="absolute inset-x-0 bottom-20 flex justify-center">
          <button
            type="button"
            onClick={togglePlay}
            className="pointer-events-auto rounded-full bg-black/80 px-3.5 py-1.5 text-[11px] text-white/85 backdrop-blur-sm"
          >
            Tap to play
          </button>
        </div>
      ) : null}

      {mutedByPolicy && !error && !blockedByPolicy ? (
        <div className="absolute top-3 right-3 flex justify-end">
          <button
            type="button"
            onClick={unmute}
            className="pointer-events-auto flex items-center gap-1.5 rounded-full bg-black/65 px-2.5 py-1 text-[11px] text-white/85 backdrop-blur-sm"
          >
            <Volume2 className="size-3.5" /> Unmute
          </button>
        </div>
      ) : null}
    </div>
  )
}
