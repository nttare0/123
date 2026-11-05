import * as React from "react"
import Hls, { ErrorTypes, Events, type HlsConfig } from "hls.js"

export type PlayerStatus = "idle" | "loading" | "buffering" | "playing" | "paused" | "error"

export interface QualityOption {
  index: number
  label: string
  height: number
  bitrate: number
}

export interface AudioOption {
  id: number
  name: string
  lang?: string
}

export interface PlayerError {
  kind: "network" | "media" | "unsupported" | "unknown"
  title: string
  detail: string
}

export interface PlaybackStats {
  bitrate: number
  height: number
  width: number
  dropped: number
  total: number
  bufferAhead: number
  latency: number
}

const EMPTY_STATS: PlaybackStats = {
  bitrate: 0,
  height: 0,
  width: 0,
  dropped: 0,
  total: 0,
  bufferAhead: 0,
  latency: 0,
}

export interface UseHlsOptions {
  src: string | null
  videoRef: React.RefObject<HTMLVideoElement | null>
  autoPlay?: boolean
  /** Called once per source when hls.js gives up — used to fail over to the next URL. */
  onFatal?: (error: PlayerError) => void
}

const HLS_CONFIG: Partial<HlsConfig> = {
  enableWorker: true,
  lowLatencyMode: false,
  backBufferLength: 30,
  manifestLoadingTimeOut: 12_000,
  manifestLoadingMaxRetry: 2,
  manifestLoadingRetryDelay: 1_000,
  levelLoadingTimeOut: 12_000,
  levelLoadingMaxRetry: 2,
  fragLoadingTimeOut: 20_000,
  fragLoadingMaxRetry: 3,
  fragLoadingRetryDelay: 1_000,
  startFragPrefetch: true,
  // Live TV: stay close to the live edge but keep a little slack for shaky links.
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
}

export function useHls({ src, videoRef, autoPlay = true, onFatal }: UseHlsOptions) {
  const [status, setStatus] = React.useState<PlayerStatus>("idle")
  const [error, setError] = React.useState<PlayerError | null>(null)
  const [levels, setLevels] = React.useState<QualityOption[]>([])
  const [currentLevel, setCurrentLevel] = React.useState(-1)
  const [audioTracks, setAudioTracks] = React.useState<AudioOption[]>([])
  const [currentAudioTrack, setCurrentAudioTrack] = React.useState(-1)
  const [stats, setStats] = React.useState<PlaybackStats>(EMPTY_STATS)
  const [isNative, setIsNative] = React.useState(false)
  const [mutedByPolicy, setMutedByPolicy] = React.useState(false)
  const [blockedByPolicy, setBlockedByPolicy] = React.useState(false)
  const [isLive, setIsLive] = React.useState(true)
  const [dvrWindow, setDvrWindow] = React.useState(0)
  const [nonce, setNonce] = React.useState(0)

  const hlsRef = React.useRef<Hls | null>(null)
  const recoveryRef = React.useRef({ network: 0, media: 0 })
  const fatalRef = React.useRef(false)
  const onFatalRef = React.useRef(onFatal)
  onFatalRef.current = onFatal

  const fail = React.useCallback((next: PlayerError) => {
    if (fatalRef.current) return
    fatalRef.current = true
    setStatus("error")
    setError(next)
    onFatalRef.current?.(next)
  }, [])

  const attemptPlay = React.useCallback(() => {
    const video = videoRef.current
    if (!video || !autoPlay) return
    const promise = video.play()
    if (!promise?.catch) return
    promise.catch(() => {
      // Browsers only allow muted autoplay without a gesture — retry, then say so.
      video.muted = true
      const retry = video.play()
      if (!retry?.catch) {
        setMutedByPolicy(true)
        return
      }
      retry
        .then(() => setMutedByPolicy(true))
        .catch(() => {
          setMutedByPolicy(false)
          setBlockedByPolicy(true)
        })
    })
  }, [autoPlay, videoRef])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!src) {
      setStatus("idle")
      setError(null)
      setLevels([])
      setStats(EMPTY_STATS)
      return
    }

    fatalRef.current = false
    recoveryRef.current = { network: 0, media: 0 }
    setStatus("loading")
    setError(null)
    setLevels([])
    setAudioTracks([])
    setCurrentLevel(-1)
    setCurrentAudioTrack(-1)
    setStats(EMPTY_STATS)
    setMutedByPolicy(false)
    setBlockedByPolicy(false)

    let hls: Hls | null = null

    if (Hls.isSupported()) {
      setIsNative(false)
      hls = new Hls(HLS_CONFIG)
      hlsRef.current = hls

      hls.on(Events.MANIFEST_PARSED, () => {
        if (!hls) return
        const options: QualityOption[] = hls.levels
          .map((level, index) => ({
            index,
            height: level.height,
            bitrate: level.bitrate,
            label: level.name || (level.height ? `${level.height}p` : `${Math.round(level.bitrate / 1000)} kbps`),
          }))
          .filter((option, index, all) =>
            all.findIndex((o) => o.height === option.height && o.bitrate === option.bitrate) === index,
          )
          .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate)
        setLevels(options)
        attemptPlay()
      })

      hls.on(Events.LEVEL_SWITCHED, (_event, data) => setCurrentLevel(data.level))

      hls.on(Events.AUDIO_TRACKS_UPDATED, (_event, data) => {
        setAudioTracks(
          data.audioTracks.map((track, index) => ({
            id: track.id ?? index,
            name: track.name || track.lang || `Track ${index + 1}`,
            lang: track.lang,
          })),
        )
      })

      hls.on(Events.ERROR, (_event, data) => {
        if (!data.fatal) return
        const kind =
          data.type === ErrorTypes.NETWORK_ERROR
            ? "network"
            : data.type === ErrorTypes.MEDIA_ERROR
              ? "media"
              : "unknown"

        if (kind === "network" && recoveryRef.current.network < 2 && hls) {
          recoveryRef.current.network += 1
          hls.startLoad()
          return
        }
        if (kind === "media" && recoveryRef.current.media < 2 && hls) {
          recoveryRef.current.media += 1
          hls.recoverMediaError()
          return
        }

        fail({
          kind,
          title:
            kind === "network"
              ? "Stream unreachable"
              : kind === "media"
                ? "Playback error"
                : "This stream cannot be played here",
          detail:
            kind === "network"
              ? "The broadcaster's server did not respond. It may be offline, geo-blocked or refusing browser requests."
              : data.error?.message || data.details || "The media pipeline failed and could not recover.",
        })
      })

      hls.loadSource(src)
      hls.attachMedia(video)
    } else if (video.canPlayType("application/vnd.apple.mpegurl")) {
      // Safari / iOS: native HLS
      setIsNative(true)
      video.src = src
      attemptPlay()
    } else {
      fail({
        kind: "unsupported",
        title: "HLS is not supported in this browser",
        detail: "Try Chrome, Edge, Firefox or Safari to watch live streams.",
      })
      return
    }

    return () => {
      if (hls) {
        hls.destroy()
        if (hlsRef.current === hls) hlsRef.current = null
      }
      video.removeAttribute("src")
      try {
        video.load()
      } catch {
        /* ignore */
      }
    }
  }, [attemptPlay, fail, nonce, src, videoRef])

  /* --- element-level state ------------------------------------------- */
  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const onPlaying = () => {
      setStatus("playing")
      setBlockedByPolicy(false)
    }
    const onWaiting = () => setStatus((s) => (s === "error" ? s : "buffering"))
    const onPause = () => setStatus((s) => (s === "error" || s === "buffering" ? s : "paused"))
    const onLoaded = () => {
      setStatus((s) => (s === "loading" ? "buffering" : s))
      setIsLive(!Number.isFinite(video.duration))
    }
    const onError = () => {
      if (isNative) {
        fail({
          kind: "network",
          title: "Stream unreachable",
          detail: "Safari could not load this playlist. It may be offline or geo-blocked.",
        })
      }
    }

    video.addEventListener("playing", onPlaying)
    video.addEventListener("waiting", onWaiting)
    video.addEventListener("pause", onPause)
    video.addEventListener("loadedmetadata", onLoaded)
    video.addEventListener("error", onError)
    return () => {
      video.removeEventListener("playing", onPlaying)
      video.removeEventListener("waiting", onWaiting)
      video.removeEventListener("pause", onPause)
      video.removeEventListener("loadedmetadata", onLoaded)
      video.removeEventListener("error", onError)
    }
  }, [fail, isNative, src, videoRef])

  /* --- stats + DVR window -------------------------------------------- */
  React.useEffect(() => {
    if (status !== "playing" && status !== "buffering") return
    const video = videoRef.current
    if (!video) return

    const tick = () => {
      const hls = hlsRef.current
      const quality = video.getVideoPlaybackQuality?.()
      const level = hls && currentLevel >= 0 ? hls.levels[currentLevel] : undefined
      const buffered = video.buffered
      setStats({
        bitrate: hls?.bandwidthEstimate ?? 0,
        height: level?.height ?? video.videoHeight,
        width: level?.width ?? video.videoWidth,
        dropped: quality?.droppedVideoFrames ?? 0,
        total: quality?.totalVideoFrames ?? 0,
        bufferAhead: buffered.length ? Math.max(0, buffered.end(buffered.length - 1) - video.currentTime) : 0,
        latency: hls?.latency ?? 0,
      })
      const seekable = video.seekable
      setDvrWindow(seekable.length ? seekable.end(seekable.length - 1) - seekable.start(0) : 0)
    }

    tick()
    const id = window.setInterval(tick, 1000)
    return () => window.clearInterval(id)
  }, [currentLevel, status, videoRef])

  const setLevel = React.useCallback(
    (index: number) => {
      const hls = hlsRef.current
      if (!hls) return
      hls.currentLevel = index
      setCurrentLevel(index)
    },
    [],
  )

  const setAudioTrack = React.useCallback((id: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.audioTrack = id
    setCurrentAudioTrack(id)
  }, [])

  const retry = React.useCallback(() => {
    fatalRef.current = false
    recoveryRef.current = { network: 0, media: 0 }
    setError(null)
    setNonce((n) => n + 1)
  }, [])

  return {
    status,
    error,
    levels,
    currentLevel,
    setLevel,
    audioTracks,
    currentAudioTrack,
    setAudioTrack,
    stats,
    isNative,
    isLive,
    dvrWindow,
    mutedByPolicy,
    blockedByPolicy,
    retry,
  }
}
