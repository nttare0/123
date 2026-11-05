import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import { useHls, type AudioOption, type PlaybackStats, type PlayerError, type PlayerStatus, type QualityOption } from "@/hooks/use-hls"
import { useCatalog } from "@/lib/catalog"
import { countryInfo } from "@/lib/collections"
import type { Channel, StreamSource } from "@/lib/iptv/types"
import { selectSources } from "@/lib/playback"
import { useLibrary } from "@/stores/library"
import { useSettings } from "@/stores/settings"

export type PlayerMode = "hidden" | "theater" | "mini"

export interface PlayOptions {
  sourceIndex?: number
  /** Channel ids that ◀ / ▶ should walk through. */
  queue?: string[]
}

interface PlayerContextValue {
  channel: Channel | null
  sources: StreamSource[]
  source: StreamSource | null
  sourceIndex: number
  queue: string[]
  mode: PlayerMode

  status: PlayerStatus
  error: PlayerError | null
  levels: QualityOption[]
  currentLevel: number
  audioTracks: AudioOption[]
  currentAudioTrack: number
  stats: PlaybackStats
  isNative: boolean
  isLive: boolean
  dvrWindow: number
  mutedByPolicy: boolean
  blockedByPolicy: boolean
  isFullscreen: boolean
  isPip: boolean
  volume: number
  muted: boolean
  /** Element in the page that the theater surface is glued to. */
  anchor: HTMLElement | null

  videoRef: React.RefObject<HTMLVideoElement | null>
  stageRef: React.RefObject<HTMLDivElement | null>

  play: (channelId: string, options?: PlayOptions) => void
  stop: () => void
  togglePlay: () => void
  selectSource: (index: number) => void
  nextSource: () => void
  retry: () => void
  setLevel: (index: number) => void
  setAudioTrack: (id: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  unmute: () => void
  toggleFullscreen: () => void
  togglePip: () => void
  jumpToLive: () => void
  nextChannel: () => void
  prevChannel: () => void
  setAnchor: (element: HTMLElement | null) => void
}

const PlayerContext = React.createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { getChannel, index, meta } = useCatalog()
  const settings = useSettings()
  const setSettings = useSettings((s) => s.set)
  const addRecent = useLibrary((s) => s.addRecent)

  const [channelId, setChannelId] = React.useState<string | null>(null)
  const [sourceIndex, setSourceIndex] = React.useState(0)
  const [queue, setQueue] = React.useState<string[]>([])
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)
  const [isPip, setIsPip] = React.useState(false)

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const triedRef = React.useRef<Set<number>>(new Set())
  const lastRecentRef = React.useRef<string | null>(null)

  const channel = channelId ? (getChannel(channelId) ?? null) : null

  const sources = React.useMemo(
    () => (channel ? selectSources(channel, settings) : []),
    [channel, settings],
  )
  const safeIndex = sources.length ? Math.min(sourceIndex, sources.length - 1) : 0
  const source = sources[safeIndex] ?? null

  const play = React.useCallback(
    (id: string, options?: PlayOptions) => {
      const found = getChannel(id)
      if (!found) {
        toast.error("That channel is not in the catalog")
        return
      }
      triedRef.current = new Set()
      setChannelId(id)
      setSourceIndex(options?.sourceIndex ?? 0)
      if (options?.queue?.length) setQueue(options.queue)
      if (lastRecentRef.current !== id) {
        lastRecentRef.current = id
        addRecent(id)
      }
    },
    [addRecent, getChannel],
  )

  const stop = React.useCallback(() => {
    const video = videoRef.current
    video?.pause()
    triedRef.current = new Set()
    setChannelId(null)
    setSourceIndex(0)
    setAnchor(null)
  }, [])

  /* --- source failover ------------------------------------------------ */
  const handleFatal = React.useCallback(
    (fatal: PlayerError) => {
      if (!channel || fatal.kind === "unsupported") return
      triedRef.current.add(safeIndex)
      if (!settings.autoFailover || sources.length < 2) return

      const next = sources.findIndex((_, i) => !triedRef.current.has(i))
      if (next === -1) return

      toast.warning(`Source ${safeIndex + 1} failed — trying source ${next + 1}`, {
        description: `${channel.name} · ${fatal.title.toLowerCase()}`,
        duration: 4000,
      })
      setSourceIndex(next)
    },
    [channel, safeIndex, settings.autoFailover, sources],
  )

  const hls = useHls({
    src: source?.url ?? null,
    videoRef,
    autoPlay: settings.autoplay,
    onFatal: handleFatal,
  })

  /* --- transport ------------------------------------------------------ */
  const togglePlay = React.useCallback(() => {
    const video = videoRef.current
    if (!video || !channel) return
    if (video.paused) void video.play().catch(() => undefined)
    else video.pause()
  }, [channel])

  const selectSource = React.useCallback((i: number) => {
    triedRef.current = new Set()
    setSourceIndex(i)
  }, [])

  const nextSource = React.useCallback(() => {
    if (sources.length < 2) return
    triedRef.current = new Set()
    setSourceIndex((i) => (i + 1) % sources.length)
    toast.info(`Switched to source ${(safeIndex + 1) % sources.length + 1} of ${sources.length}`)
  }, [safeIndex, sources.length])

  /* --- volume --------------------------------------------------------- */
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = settings.volume
    video.muted = settings.muted || hls.mutedByPolicy
  }, [channelId, hls.mutedByPolicy, settings.muted, settings.volume, sourceIndex])

  const setVolume = React.useCallback(
    (value: number) => setSettings({ volume: Math.min(1, Math.max(0, value)), muted: value === 0 }),
    [setSettings],
  )
  const toggleMute = React.useCallback(
    () => setSettings({ muted: !settings.muted }),
    [setSettings, settings.muted],
  )
  const unmute = React.useCallback(() => {
    const video = videoRef.current
    if (video) video.muted = false
    setSettings({ muted: false, volume: settings.volume || 0.8 })
  }, [setSettings, settings.volume])

  /* --- fullscreen / pip ---------------------------------------------- */
  const toggleFullscreen = React.useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.requestFullscreen?.().catch(() => toast.error("Fullscreen was blocked"))
  }, [])

  const togglePip = React.useCallback(async () => {
    const video = videoRef.current
    if (!video) return
    try {
      if (document.pictureInPictureElement) await document.exitPictureInPicture()
      else await video.requestPictureInPicture()
    } catch {
      toast.error("Picture-in-picture is not available in this browser")
    }
  }, [])

  React.useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFullscreen)
    return () => document.removeEventListener("fullscreenchange", onFullscreen)
  }, [])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    const enter = () => setIsPip(true)
    const leave = () => setIsPip(false)
    video.addEventListener("enterpictureinpicture", enter)
    video.addEventListener("leavepictureinpicture", leave)
    return () => {
      video.removeEventListener("enterpictureinpicture", enter)
      video.removeEventListener("leavepictureinpicture", leave)
    }
  }, [channelId])

  const jumpToLive = React.useCallback(() => {
    const video = videoRef.current
    if (!video || !video.seekable.length) return
    video.currentTime = video.seekable.end(video.seekable.length - 1) - 0.5
    void video.play().catch(() => undefined)
  }, [])

  /* --- channel stepping ---------------------------------------------- */
  const effectiveQueue = React.useMemo(() => {
    if (queue.length > 1) return queue
    if (!channel) return []
    return (index.byCountry.get(channel.country) ?? []).map((c) => c.id)
  }, [channel, index, queue])

  const step = React.useCallback(
    (delta: number) => {
      if (!channelId || effectiveQueue.length < 2) return
      const at = effectiveQueue.indexOf(channelId)
      const nextAt = at === -1 ? 0 : (at + delta + effectiveQueue.length) % effectiveQueue.length
      navigate(`/watch/${encodeURIComponent(effectiveQueue[nextAt])}`)
    },
    [channelId, effectiveQueue, navigate],
  )

  const nextChannel = React.useCallback(() => step(1), [step])
  const prevChannel = React.useCallback(() => step(-1), [step])

  /* --- OS media controls --------------------------------------------- */
  React.useEffect(() => {
    if (typeof navigator === "undefined" || !("mediaSession" in navigator)) return
    if (!channel) {
      navigator.mediaSession.metadata = null
      return
    }
    try {
      navigator.mediaSession.metadata = new MediaMetadata({
        title: channel.name,
        artist: countryInfo(channel.country, meta).name,
        album: "Live TV Hub",
        artwork: channel.logo
          ? [{ src: channel.logo, sizes: "512x512", type: "image/png" }]
          : [],
      })
      navigator.mediaSession.setActionHandler("play", () => togglePlay())
      navigator.mediaSession.setActionHandler("pause", () => togglePlay())
      navigator.mediaSession.setActionHandler("previoustrack", () => prevChannel())
      navigator.mediaSession.setActionHandler("nexttrack", () => nextChannel())
    } catch {
      /* media metadata is best-effort */
    }
  }, [channel, meta, nextChannel, prevChannel, togglePlay])

  const onWatch = location.pathname.startsWith("/watch/")
  const mode: PlayerMode = !channelId ? "hidden" : onWatch ? "theater" : "mini"

  const value = React.useMemo<PlayerContextValue>(
    () => ({
      channel,
      sources,
      source,
      sourceIndex: safeIndex,
      queue: effectiveQueue,
      mode,
      status: hls.status,
      error: hls.error,
      levels: hls.levels,
      currentLevel: hls.currentLevel,
      audioTracks: hls.audioTracks,
      currentAudioTrack: hls.currentAudioTrack,
      stats: hls.stats,
      isNative: hls.isNative,
      isLive: hls.isLive,
      dvrWindow: hls.dvrWindow,
      mutedByPolicy: hls.mutedByPolicy,
      blockedByPolicy: hls.blockedByPolicy,
      isFullscreen,
      isPip,
      volume: settings.volume,
      muted: settings.muted || hls.mutedByPolicy,
      anchor,
      videoRef,
      stageRef,
      play,
      stop,
      togglePlay,
      selectSource,
      nextSource,
      retry: hls.retry,
      setLevel: hls.setLevel,
      setAudioTrack: hls.setAudioTrack,
      setVolume,
      toggleMute,
      unmute,
      toggleFullscreen,
      togglePip,
      jumpToLive,
      nextChannel,
      prevChannel,
      setAnchor,
    }),
    [
      anchor,
      channel,
      effectiveQueue,
      hls,
      isFullscreen,
      isPip,
      mode,
      nextChannel,
      play,
      prevChannel,
      safeIndex,
      setVolume,
      settings.muted,
      settings.volume,
      source,
      sources,
      stop,
      toggleMute,
      togglePlay,
      unmute,
      toggleFullscreen,
      togglePip,
      jumpToLive,
      nextSource,
      selectSource,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const context = React.useContext(PlayerContext)
  if (!context) throw new Error("usePlayer must be used inside <PlayerProvider>")
  return context
}
