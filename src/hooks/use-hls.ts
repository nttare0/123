import * as React from "react"
import Hls, { ErrorTypes, Events, type HlsConfig } from "hls.js"

export type PlayerStatus = "idle" | "loading" | "buffering" | "playing" | "paused" | "error"

export interface QualityOption {
  index: number
  label: string
  height: number
  bitrate: number
}

export interface PlayerError {
  kind: "network" | "media" | "unsupported" | "unknown"
  title: string
  detail: string
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
  // Live TV: stay close to the live edge but keep slack for shaky links.
  liveSyncDurationCount: 3,
  liveMaxLatencyDurationCount: 10,
}

export function useHls({ src, videoRef, autoPlay = true, onFatal }: UseHlsOptions) {
  const [status, setStatus] = React.useState<PlayerStatus>("idle")
  const [error, setError] = React.useState<PlayerError | null>(null)
  const [levels, setLevels] = React.useState<QualityOption[]>([])
  const [currentLevel, setCurrentLevel] = React.useState(-1)
  const [isNative, setIsNative] = React.useState(false)
  const [mutedByPolicy, setMutedByPolicy] = React.useState(false)
  const [blockedByPolicy, setBlockedByPolicy] = React.useState(false)
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
    video.play()?.catch(() => {
      // Browsers only allow muted autoplay without a gesture — retry, then say so.
      video.muted = true
      video
        .play()
        ?.then(() => setMutedByPolicy(true))
        .catch(() => setBlockedByPolicy(true))
    })
  }, [autoPlay, videoRef])

  React.useEffect(() => {
    const video = videoRef.current
    if (!video) return
    if (!src) {
      setStatus("idle")
      setError(null)
      setLevels([])
      return
    }

    fatalRef.current = false
    recoveryRef.current = { network: 0, media: 0 }
    setStatus("loading")
    setError(null)
    setLevels([])
    setCurrentLevel(-1)
    setMutedByPolicy(false)
    setBlockedByPolicy(false)

    let hls: Hls | null = null

    if (Hls.isSupported()) {
      setIsNative(false)
      hls = new Hls(HLS_CONFIG)
      hlsRef.current = hls

      hls.on(Events.MANIFEST_PARSED, () => {
        if (!hls) return
        setLevels(
          hls.levels
            .map((level, index) => ({
              index,
              height: level.height,
              bitrate: level.bitrate,
              label:
                level.name ||
                (level.height
                  ? `${level.height}p`
                  : `${Math.round(level.bitrate / 1000)} kbps`),
            }))
            .filter(
              (option, index, all) =>
                all.findIndex((o) => o.height === option.height && o.bitrate === option.bitrate) ===
                index,
            )
            .sort((a, b) => b.height - a.height || b.bitrate - a.bitrate),
        )
        attemptPlay()
      })

      hls.on(Events.LEVEL_SWITCHED, (_event, data) => setCurrentLevel(data.level))

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
              ? "The broadcaster's server did not respond. It may be offline, geo-blocked, or refusing browser requests."
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
    const onLoaded = () => setStatus((s) => (s === "loading" ? "buffering" : s))
    const onError = () => {
      if (isNative) {
        fail({
          kind: "network",
          title: "Stream unreachable",
          detail: "This playlist could not be loaded. It may be offline or geo-blocked.",
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

  const setLevel = React.useCallback((index: number) => {
    const hls = hlsRef.current
    if (!hls) return
    hls.currentLevel = index
    setCurrentLevel(index)
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
    isNative,
    mutedByPolicy,
    blockedByPolicy,
    retry,
  }
}
