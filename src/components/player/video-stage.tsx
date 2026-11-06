import * as React from "react"

import { usePlayer } from "@/components/player/player-context"
import { PlayerControls } from "@/components/player/player-controls"
import { PlayerOverlay } from "@/components/player/player-overlay"
import { cn } from "@/lib/utils"

interface Rect {
  top: number
  left: number
  width: number
  height: number
}

function dockRect(): Rect {
  const vw = window.innerWidth
  const vh = window.innerHeight
  const narrow = vw < 640
  const width = Math.round(narrow ? Math.min(vw - 16, 340) : Math.min(384, Math.max(288, vw * 0.26)))
  const height = Math.round((width * 9) / 16)
  const pad = narrow ? 8 : 16
  return { top: vh - height - pad, left: vw - width - pad, width, height }
}

/**
 * The one and only <video> element.
 *
 * It lives in a fixed layer that morphs between three shapes:
 *   theater — exactly on top of the placeholder the watch page reserves
 *   mini    — a floating dock, so navigating away never interrupts playback
 *   hidden  — parked off-screen (kept mounted so the media pipeline survives)
 *
 * Because the element is never re-parented, playback continues across route
 * changes, sidebar collapses and fullscreen toggles.
 */
export function VideoStage() {
  const { channel, mode, anchor, stageRef, videoRef, status } = usePlayer()
  const [rect, setRect] = React.useState<Rect | null>(null)
  const [effective, setEffective] = React.useState<"hidden" | "theater" | "mini">("hidden")
  const [hovering, setHovering] = React.useState(false)
  const [idle, setIdle] = React.useState(false)

  React.useLayoutEffect(() => {
    if (!channel) {
      setEffective("hidden")
      return
    }

    let frame = 0
    let disposed = false

    const apply = () => {
      frame = 0
      if (disposed) return

      if (mode === "theater" && anchor?.isConnected) {
        const box = anchor.getBoundingClientRect()
        const visible =
          box.width > 200 && box.bottom > 160 && box.top < window.innerHeight - 80
        if (visible) {
          setEffective("theater")
          setRect({ top: box.top, left: box.left, width: box.width, height: box.height })
          return
        }
      }

      setEffective("mini")
      setRect(dockRect())
    }

    const schedule = () => {
      if (!frame) frame = requestAnimationFrame(apply)
    }

    apply()
    window.addEventListener("scroll", schedule, { passive: true })
    window.addEventListener("resize", schedule)
    const observer = new ResizeObserver(schedule)
    if (anchor?.isConnected) observer.observe(anchor)
    observer.observe(document.documentElement)

    return () => {
      disposed = true
      cancelAnimationFrame(frame)
      window.removeEventListener("scroll", schedule)
      window.removeEventListener("resize", schedule)
      observer.disconnect()
    }
  }, [anchor, channel, mode])

  // Auto-hide the theater chrome while a stream is playing cleanly.
  React.useEffect(() => {
    if (effective !== "theater" || status !== "playing" || hovering) {
      setIdle(false)
      return
    }
    const id = window.setTimeout(() => setIdle(true), 3000)
    return () => window.clearTimeout(id)
  }, [effective, hovering, idle, status])

  const wake = React.useCallback(() => setIdle(false), [])

  return (
    <div
      ref={stageRef}
      data-player-stage=""
      data-mode={effective}
      onPointerMove={wake}
      onPointerEnter={() => setHovering(true)}
      onPointerLeave={() => setHovering(false)}
      className={cn(
        "fixed z-30 overflow-hidden bg-black text-white shadow-black/40 select-none",
        effective === "hidden" && "pointer-events-none opacity-0",
        effective === "theater" && "rounded-xl ring-1 ring-border/60 shadow-2xl",
        effective === "mini" &&
          "rounded-xl ring-1 ring-border/70 shadow-2xl transition-[top,left,width,height,opacity] duration-300 ease-out",
        idle && effective === "theater" && "cursor-none",
      )}
      style={
        rect
          ? { top: rect.top, left: rect.left, width: rect.width, height: rect.height }
          : { top: 0, left: 0, width: 1, height: 1, opacity: 0 }
      }
    >
      <video ref={videoRef} className="size-full bg-black object-contain" playsInline />

      {channel ? (
        <>
          <PlayerOverlay mode={effective} idle={idle} onWake={wake} />
          <PlayerControls mode={effective} idle={idle} onWake={wake} />
        </>
      ) : null}
    </div>
  )
}
