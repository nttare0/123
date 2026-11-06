import * as React from "react"
import { useLocation, useNavigate } from "react-router-dom"
import { toast } from "sonner"

import {
  useHls,
  type PlayerError,
  type PlayerStatus,
  type QualityOption,
} from "@/hooks/use-hls"
import { useCatalog } from "@/lib/catalog"
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
  isNative: boolean
  mutedByPolicy: boolean
  blockedByPolicy: boolean
  isFullscreen: boolean
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
  retry: () => void
  setLevel: (index: number) => void
  setVolume: (value: number) => void
  toggleMute: () => void
  unmute: () => void
  toggleFullscreen: () => void
  nextChannel: () => void
  prevChannel: () => void
  setAnchor: (element: HTMLElement | null) => void
}

const PlayerContext = React.createContext<PlayerContextValue | null>(null)

export function PlayerProvider({ children }: { children: React.ReactNode }) {
  const navigate = useNavigate()
  const location = useLocation()
  const { getChannel, index } = useCatalog()
  const settings = useSettings()
  const setSettings = useSettings((s) => s.set)
  const addRecent = useLibrary((s) => s.addRecent)

  const [channelId, setChannelId] = React.useState<string | null>(null)
  const [sourceIndex, setSourceIndex] = React.useState(0)
  const [queue, setQueue] = React.useState<string[]>([])
  const [anchor, setAnchor] = React.useState<HTMLElement | null>(null)
  const [isFullscreen, setIsFullscreen] = React.useState(false)

  const videoRef = React.useRef<HTMLVideoElement | null>(null)
  const stageRef = React.useRef<HTMLDivElement | null>(null)
  const triedRef = React.useRef<Set<number>>(new Set())
  const lastRecentRef = React.useRef<string | null>(null)

  const channel = channelId ? (getChannel(channelId) ?? null) : null

  const sources = React.useMemo(
    () => (channel ? selectSources(channel, settings.hideHeaderOnly) : []),
    [channel, settings.hideHeaderOnly],
  )
  const safeIndex = sources.length ? Math.min(sourceIndex, sources.length - 1) : 0
  const source = sources[safeIndex] ?? null

  const play = React.useCallback(
    (id: string, options?: PlayOptions) => {
      if (!getChannel(id)) {
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
    videoRef.current?.pause()
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
        description: channel.name,
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
    if (video.paused) video.play().catch(() => undefined)
    else video.pause()
  }, [channel])

  const selectSource = React.useCallback((i: number) => {
    triedRef.current = new Set()
    setSourceIndex(i)
  }, [])

  /* --- volume --------------------------------------------------------- */
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    video.volume = settings.volume
    video.muted = settings.muted || hls.mutedByPolicy
  }, [channelId, hls.mutedByPolicy, settings.muted, settings.volume, sourceIndex])

  const setVolume = React.useCallback(
    (value: number) =>
      setSettings({ volume: Math.min(1, Math.max(0, value)), muted: value === 0 }),
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

  /* --- fullscreen ----------------------------------------------------- */
  const toggleFullscreen = React.useCallback(() => {
    const stage = stageRef.current
    if (!stage) return
    if (document.fullscreenElement) document.exitFullscreen().catch(() => undefined)
    else
      stage
        .requestFullscreen?.()
        .catch(() => toast.error("Fullscreen was blocked by the browser"))
  }, [])

  React.useEffect(() => {
    const onFullscreen = () => setIsFullscreen(Boolean(document.fullscreenElement))
    document.addEventListener("fullscreenchange", onFullscreen)
    return () => document.removeEventListener("fullscreenchange", onFullscreen)
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
        artist: "Live TV Hub",
        album: "Live TV",
        artwork: channel.logo ? [{ src: channel.logo, sizes: "512x512", type: "image/png" }] : [],
      })
      navigator.mediaSession.setActionHandler("play", () => togglePlay())
      navigator.mediaSession.setActionHandler("pause", () => togglePlay())
      navigator.mediaSession.setActionHandler("previoustrack", () => prevChannel())
      navigator.mediaSession.setActionHandler("nexttrack", () => nextChannel())
    } catch {
      /* media metadata is best-effort */
    }
  }, [channel, nextChannel, prevChannel, togglePlay])

  const mode: PlayerMode = !channelId
    ? "hidden"
    : location.pathname.startsWith("/watch/")
      ? "theater"
      : "mini"

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
      isNative: hls.isNative,
      mutedByPolicy: hls.mutedByPolicy,
      blockedByPolicy: hls.blockedByPolicy,
      isFullscreen,
      volume: settings.volume,
      muted: settings.muted || hls.mutedByPolicy,
      anchor,
      videoRef,
      stageRef,
      play,
      stop,
      togglePlay,
      selectSource,
      retry: hls.retry,
      setLevel: hls.setLevel,
      setVolume,
      toggleMute,
      unmute,
      toggleFullscreen,
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
      mode,
      nextChannel,
      play,
      prevChannel,
      safeIndex,
      selectSource,
      setVolume,
      settings.muted,
      settings.volume,
      source,
      sources,
      stop,
      toggleFullscreen,
      toggleMute,
      togglePlay,
      unmute,
    ],
  )

  return <PlayerContext.Provider value={value}>{children}</PlayerContext.Provider>
}

export function usePlayer(): PlayerContextValue {
  const context = React.useContext(PlayerContext)
  if (!context) throw new Error("usePlayer must be used inside <PlayerProvider>")
  return context
}
