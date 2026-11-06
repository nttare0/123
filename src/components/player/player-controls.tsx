import * as React from "react"
import { Expand, Maximize, Minimize, Pause, Play, Volume1, Volume2, VolumeX, X } from "lucide-react"
import { useNavigate } from "react-router-dom"

import { usePlayer } from "@/components/player/player-context"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Slider } from "@/components/ui/slider"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { hostnameOf, qualityLabel } from "@/lib/format"
import { sourceWarnings } from "@/lib/playback"
import { cn } from "@/lib/utils"

function Icon({
  label,
  onClick,
  children,
  container,
  className,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  container?: HTMLElement | null
  className?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          size="icon"
          aria-label={label}
          onClick={onClick}
          className={cn("size-9 text-white/80 hover:bg-white/15 hover:text-white", className)}
        >
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent side="top" container={container ?? undefined}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}

function LiveDot() {
  return (
    <span className="flex items-center gap-1.5 text-[11px] font-semibold tracking-wider text-white/80 uppercase">
      <span className="size-1.5 animate-live-pulse rounded-full bg-red-500" />
      Live
    </span>
  )
}

export function PlayerControls({
  mode,
  idle,
  onWake,
}: {
  mode: "theater" | "mini" | "hidden"
  idle: boolean
  onWake: () => void
}) {
  const player = usePlayer()
  const navigate = useNavigate()
  const { channel, source, sources, sourceIndex, status, levels, currentLevel, isFullscreen, isNative, volume, muted, stageRef } =
    player

  const container = stageRef.current
  const playing = status === "playing"

  if (!channel) return null
  const open = () => navigate(`/watch/${encodeURIComponent(channel.id)}`)

  /* ------------------------------- mini ------------------------------- */
  if (mode !== "theater") {
    return (
      <div className="absolute inset-0 flex flex-col justify-between" onPointerMove={onWake}>
        <button
          type="button"
          onClick={open}
          className="flex items-center gap-2 bg-gradient-to-b from-black/75 to-transparent p-2 text-left"
        >
          <span className="min-w-0 flex-1 truncate text-xs font-medium text-white">
            {channel.name}
          </span>
          <LiveDot />
        </button>

        <div className="flex items-center gap-0.5 bg-gradient-to-t from-black/85 to-transparent p-1">
          <Icon label={playing ? "Pause" : "Play"} onClick={player.togglePlay} className="size-8">
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </Icon>
          <Icon label={muted ? "Unmute" : "Mute"} onClick={player.toggleMute} className="size-8">
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </Icon>
          <span className="mx-1 min-w-0 flex-1 truncate text-[10px] text-white/50">
            {source ? hostnameOf(source.url) : ""}
          </span>
          <Icon label="Open channel" onClick={open} className="size-8">
            <Expand className="size-4" />
          </Icon>
          <Icon label="Stop" onClick={player.stop} className="size-8">
            <X className="size-4" />
          </Icon>
        </div>
      </div>
    )
  }

  /* ------------------------------ theater ----------------------------- */
  return (
    <div
      className={cn(
        "absolute inset-0 flex flex-col justify-between transition-opacity duration-300",
        idle && "pointer-events-none opacity-0",
      )}
      onPointerMove={onWake}
    >
      <div className="flex items-center gap-3 bg-gradient-to-b from-black/75 to-transparent p-3 sm:p-4">
        <h2 className="min-w-0 flex-1 truncate text-sm font-medium text-white sm:text-base">
          {channel.name}
        </h2>
        <LiveDot />
      </div>

      <div className="flex items-center gap-1.5 bg-gradient-to-t from-black/85 to-transparent px-3 pt-8 pb-3 sm:px-4">
        <Icon label={playing ? "Pause (space)" : "Play (space)"} onClick={player.togglePlay}>
          {playing ? <Pause /> : <Play />}
        </Icon>
        <Icon label={muted ? "Unmute (m)" : "Mute (m)"} onClick={player.toggleMute}>
          {muted || volume === 0 ? <VolumeX /> : volume < 0.5 ? <Volume1 /> : <Volume2 />}
        </Icon>
        <Slider
          aria-label="Volume"
          className="ml-1 hidden w-20 sm:flex lg:w-24"
          min={0}
          max={100}
          step={1}
          value={[Math.round((muted ? 0 : volume) * 100)]}
          onValueChange={([v]) => player.setVolume((v ?? 0) / 100)}
        />

        <div className="ml-auto flex items-center gap-1.5">
          {sources.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-xs text-white/80 hover:bg-white/15 hover:text-white"
                >
                  Source {sourceIndex + 1}/{sources.length}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" container={container ?? undefined} className="max-w-80">
                <DropdownMenuLabel>Stream sources</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={String(sourceIndex)}
                  onValueChange={(v) => player.selectSource(Number(v))}
                >
                  {sources.map((s, i) => {
                    const warnings = sourceWarnings(s)
                    return (
                      <DropdownMenuRadioItem key={`${s.url}-${i}`} value={String(i)}>
                        <span className="flex min-w-0 flex-col">
                          <span className="truncate text-xs">
                            {i + 1}. {qualityLabel(s.quality) ?? "Auto"} · {hostnameOf(s.url)}
                          </span>
                          {warnings.length ? (
                            <span className="truncate text-[10px] text-muted-foreground">
                              {warnings.join(" · ")}
                            </span>
                          ) : null}
                        </span>
                      </DropdownMenuRadioItem>
                    )
                  })}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          {!isNative && levels.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-9 px-2.5 text-xs text-white/80 hover:bg-white/15 hover:text-white"
                >
                  {currentLevel === -1
                    ? "Auto"
                    : `${levels.find((l) => l.index === currentLevel)?.height ?? 0}p`}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" container={container ?? undefined}>
                <DropdownMenuLabel>Quality</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={String(currentLevel)}
                  onValueChange={(v) => player.setLevel(Number(v))}
                >
                  <DropdownMenuRadioItem value="-1">Auto</DropdownMenuRadioItem>
                  {levels.map((level) => (
                    <DropdownMenuRadioItem key={level.index} value={String(level.index)}>
                      {level.height ? `${level.height}p` : level.label}
                      <span className="ml-auto pl-4 text-[10px] text-muted-foreground">
                        {(level.bitrate / 1_000_000).toFixed(1)} Mb/s
                      </span>
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <Icon
            label={isFullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"}
            onClick={player.toggleFullscreen}
            container={container}
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </Icon>
        </div>
      </div>
    </div>
  )
}
