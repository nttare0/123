import * as React from "react"
import {
  AudioLines,
  ChevronLeft,
  ChevronRight,
  Expand,
  Gauge,
  Heart,
  ListVideo,
  Maximize,
  Minimize,
  Pause,
  PictureInPicture2,
  Play,
  Radio,
  RotateCw,
  Settings2,
  SkipForward,
  Volume1,
  Volume2,
  VolumeX,
  X,
} from "lucide-react"
import { useNavigate } from "react-router-dom"

import { usePlayer } from "@/components/player/player-context"
import { Badge } from "@/components/ui/badge"
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
import { ChannelLogo } from "@/components/channel/channel-logo"
import { countryInfo } from "@/lib/collections"
import { hostnameOf, qualityLabel } from "@/lib/format"
import { sourceWarnings } from "@/lib/playback"
import { cn } from "@/lib/utils"
import { useCatalog } from "@/lib/catalog"
import { useLibrary } from "@/stores/library"
import { useSettings } from "@/stores/settings"

interface ControlsProps {
  mode: "theater" | "mini" | "hidden"
  idle: boolean
  onWake: () => void
}

function IconButton({
  label,
  onClick,
  children,
  active,
  container,
  className,
}: {
  label: string
  onClick: () => void
  children: React.ReactNode
  active?: boolean
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
          title={label}
          onClick={onClick}
          className={cn(
            "size-8 text-white/80 hover:bg-white/15 hover:text-white sm:size-9",
            active && "bg-white/15 text-white",
            className,
          )}
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

export function PlayerControls({ mode, idle, onWake }: ControlsProps) {
  const player = usePlayer()
  const navigate = useNavigate()
  const { meta } = useCatalog()
  const favorites = useLibrary((s) => s.favorites)
  const toggleFavorite = useLibrary((s) => s.toggleFavorite)
  const {
    channel,
    source,
    sources,
    sourceIndex,
    status,
    levels,
    currentLevel,
    audioTracks,
    currentAudioTrack,
    isFullscreen,
    isNative,
    isLive,
    dvrWindow,
    volume,
    muted,
    stageRef,
  } = player

  const container = stageRef.current
  const isFav = channel ? favorites.includes(channel.id) : false
  const playing = status === "playing"

  if (!channel) return null

  /* ------------------------------- mini ------------------------------- */
  if (mode !== "theater") {
    return (
      <div className="absolute inset-0 flex flex-col justify-between" onPointerMove={onWake}>
        <div className="flex items-start justify-between gap-2 bg-gradient-to-b from-black/75 to-transparent p-2">
          <button
            type="button"
            onClick={() => navigate(`/watch/${encodeURIComponent(channel.id)}`)}
            className="flex min-w-0 items-center gap-2 text-left"
          >
            <ChannelLogo channel={channel} className="size-6 shrink-0 rounded" />
            <span className="min-w-0">
              <span className="block truncate text-xs font-semibold text-white">{channel.name}</span>
              <span className="block truncate text-[10px] text-white/60">
                {countryInfo(channel.country, meta).flag}{" "}
                {countryInfo(channel.country, meta).name}
              </span>
            </span>
          </button>
          <span className="flex items-center gap-1 rounded-full bg-red-600/90 px-1.5 py-0.5 text-[9px] font-bold tracking-wider text-white uppercase">
            <span className="size-1.5 animate-live-pulse rounded-full bg-white" />
            Live
          </span>
        </div>

        <div className="flex items-center gap-1 bg-gradient-to-t from-black/85 to-transparent p-1.5">
          <IconButton
            label={playing ? "Pause" : "Play"}
            onClick={player.togglePlay}
            className="size-7"
          >
            {playing ? <Pause className="size-4" /> : <Play className="size-4" />}
          </IconButton>
          <IconButton
            label={muted ? "Unmute" : "Mute"}
            onClick={player.toggleMute}
            className="size-7"
          >
            {muted ? <VolumeX className="size-4" /> : <Volume2 className="size-4" />}
          </IconButton>
          <span className="mx-1 min-w-0 flex-1 truncate text-[10px] text-white/60">
            {source ? hostnameOf(source.url) : ""}
          </span>
          <IconButton
            label="Expand player"
            onClick={() => navigate(`/watch/${encodeURIComponent(channel.id)}`)}
            className="size-7"
          >
            <Expand className="size-4" />
          </IconButton>
          <IconButton label="Stop playback" onClick={player.stop} className="size-7">
            <X className="size-4" />
          </IconButton>
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
      {/* top */}
      <div className="flex items-start gap-3 bg-gradient-to-b from-black/80 via-black/35 to-transparent p-3 sm:p-4">
        <ChannelLogo channel={channel} className="size-9 shrink-0 rounded-md sm:size-11" />
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="truncate text-sm font-semibold text-white sm:text-base">{channel.name}</h2>
            <span className="flex items-center gap-1.5 rounded-full bg-red-600 px-2 py-0.5 text-[10px] font-bold tracking-wider text-white uppercase">
              <span className="size-1.5 animate-live-pulse rounded-full bg-white" />
              Live
            </span>
            {source?.quality ? (
              <Badge variant="outline" className="border-white/25 text-[10px] text-white/80">
                {qualityLabel(source.quality)}
              </Badge>
            ) : null}
          </div>
          <p className="mt-0.5 truncate text-xs text-white/60">
            {countryInfo(channel.country, meta).flag} {countryInfo(channel.country, meta).name}
            {channel.categories.length ? ` · ${channel.categories.join(", ")}` : ""}
            {sources.length > 1 ? ` · source ${sourceIndex + 1}/${sources.length}` : ""}
          </p>
        </div>

        <div className="flex items-center gap-1">
          <IconButton
            label={isFav ? "Remove from favourites" : "Add to favourites"}
            onClick={() => toggleFavorite(channel.id)}
            active={isFav}
            container={container}
          >
            <Heart className={cn("size-4", isFav && "fill-current text-red-400")} />
          </IconButton>
          <IconButton
            label="Channel details"
            onClick={() => navigate(`/watch/${encodeURIComponent(channel.id)}#details`)}
            container={container}
          >
            <Radio className="size-4" />
          </IconButton>
        </div>
      </div>

      {/* bottom */}
      <div className="flex flex-wrap items-center gap-x-1.5 gap-y-2 bg-gradient-to-t from-black/85 via-black/40 to-transparent px-3 pt-8 pb-3 sm:px-4">
        <IconButton label={playing ? "Pause (k)" : "Play (k)"} onClick={player.togglePlay}>
          {playing ? <Pause /> : <Play />}
        </IconButton>
        <IconButton label="Previous channel (←)" onClick={player.prevChannel}>
          <ChevronLeft />
        </IconButton>
        <IconButton label="Next channel (→)" onClick={player.nextChannel}>
          <ChevronRight />
        </IconButton>

        <div className="ml-1 flex items-center gap-2">
          <IconButton label={muted ? "Unmute (m)" : "Mute (m)"} onClick={player.toggleMute}>
            {muted || volume === 0 ? <VolumeX /> : volume < 0.5 ? <Volume1 /> : <Volume2 />}
          </IconButton>
          <Slider
            aria-label="Volume"
            className="hidden w-20 sm:flex lg:w-24"
            min={0}
            max={100}
            step={1}
            value={[Math.round((muted ? 0 : volume) * 100)]}
            onValueChange={([v]) => player.setVolume((v ?? 0) / 100)}
          />
        </div>

        <span className="ml-2 hidden items-center gap-1.5 text-[11px] font-medium text-white/70 md:flex">
          {isLive ? (
            <>
              <span className="size-1.5 animate-live-pulse rounded-full bg-red-500" />
              LIVE
              {dvrWindow > 60 ? (
                <button
                  type="button"
                  onClick={player.jumpToLive}
                  className="ml-1 rounded-full bg-white/10 px-2 py-0.5 text-[10px] text-white/70 hover:bg-white/20 hover:text-white"
                >
                  {Math.round(dvrWindow / 60)} min rewind · jump to live
                </button>
              ) : null}
            </>
          ) : (
            "VOD"
          )}
        </span>

        <div className="ml-auto flex items-center gap-1.5">
          {/* sources */}
          {sources.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-white/80 hover:bg-white/15 hover:text-white"
                >
                  <ListVideo className="size-4" />
                  <span className="hidden text-xs sm:inline">
                    Source {sourceIndex + 1}/{sources.length}
                  </span>
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
                      <DropdownMenuRadioItem key={`${s.url}-${i}`} value={String(i)} className="gap-2">
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

          {/* quality */}
          {!isNative && levels.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-white/80 hover:bg-white/15 hover:text-white"
                >
                  <Gauge className="size-4" />
                  <span className="hidden text-xs lg:inline">
                    {currentLevel === -1
                      ? "Auto"
                      : (qualityLabel(`${levels.find((l) => l.index === currentLevel)?.height ?? 0}p`) ??
                        "Auto")}
                  </span>
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

          {/* audio tracks */}
          {audioTracks.length > 1 ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-8 gap-1.5 px-2 text-white/80 hover:bg-white/15 hover:text-white"
                >
                  <AudioLines className="size-4" />
                  <span className="hidden text-xs lg:inline">Audio</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" container={container ?? undefined}>
                <DropdownMenuLabel>Audio track</DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuRadioGroup
                  value={String(currentAudioTrack)}
                  onValueChange={(v) => player.setAudioTrack(Number(v))}
                >
                  {audioTracks.map((track) => (
                    <DropdownMenuRadioItem key={track.id} value={String(track.id)}>
                      {track.name}
                      {track.lang ? ` (${track.lang})` : ""}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : null}

          <IconButton label="Reload stream (r)" onClick={player.retry} container={container}>
            <RotateCw />
          </IconButton>
          {sources.length > 1 ? (
            <IconButton
              label="Next source (n)"
              onClick={player.nextSource}
              container={container}
            >
              <SkipForward />
            </IconButton>
          ) : null}
          <IconButton
            label="Playback stats"
            onClick={() => useSettings.setState((s) => ({ showStats: !s.showStats }))}
            container={container}
          >
            <Settings2 />
          </IconButton>
          <IconButton label="Picture in picture (p)" onClick={player.togglePip} container={container}>
            <PictureInPicture2 />
          </IconButton>
          <IconButton
            label={isFullscreen ? "Exit fullscreen (f)" : "Fullscreen (f)"}
            onClick={player.toggleFullscreen}
            container={container}
          >
            {isFullscreen ? <Minimize /> : <Maximize />}
          </IconButton>
        </div>
      </div>
    </div>
  )
}
