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
import { assessConnection } from "@/lib/network"
import { selectSources } from "@/lib/playback"
import { useLibrary } from "@/stores/library"
import { useSettings } from "@/stores/settings"

export type PlayerMode = "hidden" | "theater" | "mini"

/** How long a source may stay silent at startup before it counts as broken. */
const STARTUP_GRACE_MS = 15_000
/** How long mid-playback buffering may last before failing over. */
const STALL_GRACE_MS = 25_000

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
  const reportRef = React.useRef<(error: PlayerError) => void>(() => {})
  const failoverPendingRef = React.useRef(false)
  const failoverTokenRef = React.useRef(0)
  const startedRef = React.useRef(false)
  const statusRef = React.useRef<PlayerStatus>("idle")

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
      failoverTokenRef.current += 1
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
    failoverTokenRef.current += 1
    triedRef.current = new Set()
    setChannelId(null)
    setSourceIndex(0)
    setAnchor(null)
  }, [])

  /* --- source failover ------------------------------------------------ */
  /**
   * A source has stopped working (hls.js gave up, or the watchdog saw no
   * video). When the viewer's connection measures healthy the next mirror is
   * tried automatically; when the connection itself is slow, stay put and say
   * so — churning through every mirror would only make things worse.
   */
  const tryNextSource = React.useCallback(
    (reason: PlayerError) => {
      if (!channel || reason.kind === "unsupported") return
      triedRef.current.add(safeIndex)

      const next = sources.findIndex((_, i) => !triedRef.current.has(i))
      const giveUp = (error: PlayerError) => reportRef.current(error)

      if (!settings.autoFailover) {
        giveUp(reason)
        return
      }
      if (next === -1) {
        giveUp({
          ...reason,
          title: "No working source",
          detail: `Every listed source failed for this channel. ${reason.detail}`,
        })
        return
      }
      if (failoverPendingRef.current) return
      failoverPendingRef.current = true
      const token = failoverTokenRef.current
      void assessConnection().then(({ quality, mbps }) => {
        failoverPendingRef.current = false
        if (token !== failoverTokenRef.current) return
        const speed = mbps != null ? `connection ≈ ${mbps.toFixed(1)} Mb/s` : null
        if (quality === "poor") {
          toast.warning("Your internet connection looks slow", {
            description: speed
              ? `Measured ${speed} — not switching sources automatically; the problem may be your link.`
              : "Not switching sources automatically; the problem may be your link.",
            duration: 6000,
          })
          giveUp(reason)
          return
        }
        toast.warning(`Source ${safeIndex + 1} is not working — trying source ${next + 1}`, {
          description: speed ? `${channel.name} · ${speed}` : channel.name,
          duration: 4000,
        })
        setSourceIndex(next)
      })
    },
    [channel, safeIndex, settings.autoFailover, sources],
  )

  const hls = useHls({
    src: source?.url ?? null,
    videoRef,
    autoPlay: settings.autoplay,
    onFatal: tryNextSource,
  })
  reportRef.current = hls.reportFatal
  statusRef.current = hls.status

  /* --- dead-source watchdog ------------------------------------------- */
  // Sources that "connect" but never produce video fail without ever raising
  // an hls.js error — treat a silent source as broken after a grace period.
  React.useEffect(() => {
    startedRef.current = false
  }, [channelId, source?.url])

  React.useEffect(() => {
    if (hls.status === "playing") startedRef.current = true
  }, [hls.status])

  React.useEffect(() => {
    if (!channel || !source) return
    const status = hls.status
    if (status === "error" || status === "paused" || status === "playing") return
    const grace = startedRef.current ? STALL_GRACE_MS : STARTUP_GRACE_MS
    const timer = window.setTimeout(() => {
      const video = videoRef.current
      if (!video || video.paused) return
      const now = statusRef.current
      if (now === "playing" || now === "paused" || now === "error") return
      tryNextSource({
        kind: "network",
        title: "Stream is not responding",
        detail: "This source connected but never produced video. It may be offline or overloaded.",
      })
    }, grace)
    return () => window.clearTimeout(timer)
  }, [channel, source, hls.status, tryNextSource])

  /* --- transport ------------------------------------------------------ */
  const togglePlay = React.useCallback(() => {
    const video = videoRef.current
    if (!video || !channel) return
    if (video.paused) video.play().catch(() => undefined)
    else video.pause()
  }, [channel])

  const selectSource = React.useCallback((i: number) => {
    failoverTokenRef.current += 1
    triedRef.current = new Set()
    setSourceIndex(i)
  }, [])

  const retry = React.useCallback(() => {
    failoverTokenRef.current += 1
    triedRef.current = new Set()
    hls.retry()
  }, [hls.retry])

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
        artist: "Zepvi",
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
      retry,
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
      retry,
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
