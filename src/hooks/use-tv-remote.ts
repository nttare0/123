import * as React from "react"

/**
 * Spatial (TV-remote) navigation.
 *
 * Any focusable element carrying `data-tv-item` becomes part of the grid.
 * Arrow keys move focus to the visually nearest item in that direction, so a
 * D-pad works across grids, carousels and sidebars without any manual index
 * bookkeeping. Programmatic focus is tagged with `data-tv-focused="true"` so
 * the ring stays huge and obvious on a TV, while mouse users get normal
 * `:hover` / `:focus-visible` behaviour.
 */

const ITEM = "[data-tv-item]"
const BLOCKED =
  'input, textarea, select, [contenteditable="true"], [role="dialog"], [data-tv-block="true"]'

type Direction = "up" | "down" | "left" | "right"

interface Rect {
  el: HTMLElement
  top: number
  left: number
  cx: number
  cy: number
  width: number
  height: number
}

function rects(selector: string, root: ParentNode = document): Rect[] {
  const out: Rect[] = []
  for (const el of Array.from(root.querySelectorAll<HTMLElement>(selector))) {
    if (el.hasAttribute("disabled") || el.getAttribute("aria-hidden") === "true") continue
    const r = el.getBoundingClientRect()
    if (r.width < 2 || r.height < 2) continue
    // Skip things scrolled out of the viewport (but keep partially visible ones).
    if (r.bottom < -40 || r.top > window.innerHeight + 40) continue
    if (r.right < -40 || r.left > window.innerWidth + 40) continue
    if (!el.checkVisibility?.({ checkOpacity: false, checkVisibilityCSS: true })) continue
    out.push({
      el,
      top: r.top,
      left: r.left,
      cx: r.left + r.width / 2,
      cy: r.top + r.height / 2,
      width: r.width,
      height: r.height,
    })
  }
  return out
}

function mark(el: HTMLElement) {
  for (const other of document.querySelectorAll<HTMLElement>('[data-tv-focused="true"]')) {
    if (other !== el) other.removeAttribute("data-tv-focused")
  }
  el.setAttribute("data-tv-focused", "true")
  el.scrollIntoView({ block: "nearest", inline: "nearest" })
  el.focus({ preventScroll: true })
}

function nearest(from: Rect, direction: Direction, candidates: Rect[]): Rect | null {
  let best: Rect | null = null
  let bestScore = Number.POSITIVE_INFINITY

  for (const candidate of candidates) {
    if (candidate.el === from.el) continue
    const dx = candidate.cx - from.cx
    const dy = candidate.cy - from.cy

    let primary: number
    let cross: number
    switch (direction) {
      case "up":
        primary = -dy
        cross = Math.abs(dx)
        break
      case "down":
        primary = dy
        cross = Math.abs(dx)
        break
      case "left":
        primary = -dx
        cross = Math.abs(dy)
        break
      case "right":
        primary = dx
        cross = Math.abs(dy)
        break
    }
    if (primary < 8) continue // not actually in that direction

    // Cone constraint: refuse candidates far off-axis unless nothing else exists.
    const score = primary + cross * 2.2 + (cross > primary * 2 ? 10_000 : 0)
    if (score < bestScore) {
      bestScore = score
      best = candidate
    }
  }
  return best
}

export interface TvRemoteOptions {
  enabled?: boolean
  /** Fired for Escape / Backspace when nothing else consumed the key. */
  onBack?: () => void
  /** Fired for Enter on a focused item — returning true skips the native click. */
  onSelect?: (element: HTMLElement) => boolean | void
}

export function useTvRemote({ enabled = true, onBack, onSelect }: TvRemoteOptions = {}) {
  const handlers = React.useRef({ onBack, onSelect })
  handlers.current = { onBack, onSelect }

  React.useEffect(() => {
    if (!enabled) return

    const clearMarks = () => {
      for (const el of document.querySelectorAll<HTMLElement>('[data-tv-focused="true"]')) {
        el.removeAttribute("data-tv-focused")
      }
    }

    const activeItem = (): Rect | null => {
      const active = document.activeElement
      if (active instanceof HTMLElement && active.matches(ITEM)) {
        const found = rects(ITEM).find((r) => r.el === active)
        if (found) return found
      }
      return null
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey) return
      const target = event.target as HTMLElement | null
      if (target?.closest(BLOCKED)) return

      const key = event.key
      const directionMap: Record<string, Direction> = {
        ArrowUp: "up",
        ArrowDown: "down",
        ArrowLeft: "left",
        ArrowRight: "right",
      }
      const all = rects(ITEM)
      if (!all.length) return

      if (key === "Escape" || key === "Backspace") {
        if (handlers.current.onBack) {
          event.preventDefault()
          handlers.current.onBack()
        }
        return
      }

      if (key === "Enter") {
        const current = activeItem()
        if (current && handlers.current.onSelect?.(current.el) === true) event.preventDefault()
        return // otherwise let the browser activate the link/button
      }

      if (directionMap[key]) {
        event.preventDefault()
        const direction = directionMap[key]
        const current = activeItem()
        if (!current) {
          // Nothing focused yet: enter the grid from the edge we came from.
          const sorted = [...all].sort((a, b) =>
            direction === "up" || direction === "left" ? b.cy - a.cy || b.cx - a.cx : a.cy - b.cy || a.cx - b.cx,
          )
          mark(sorted[0].el)
          return
        }
        const next = nearest(current, direction, all)
        mark((next ?? current).el)
        return
      }

      if (key === "PageDown" || key === "PageUp") {
        event.preventDefault()
        const current = activeItem()
        const step = window.innerHeight * 0.8
        if (!current) {
          mark(all[0].el)
          return
        }
        const direction: Direction = key === "PageDown" ? "down" : "up"
        const target = all
          .filter((r) => r.el !== current.el)
          .filter((r) => (direction === "down" ? r.cy > current.cy : r.cy < current.cy))
          .filter((r) => Math.abs(r.cy - current.cy) <= step * 1.6)
          .sort((a, b) =>
            direction === "down"
              ? b.cy - a.cy || Math.abs(b.cx - current.cx) - Math.abs(a.cx - current.cx)
              : a.cy - b.cy || Math.abs(a.cx - current.cx) - Math.abs(b.cx - current.cx),
          )[0]
        mark((target ?? all[direction === "down" ? all.length - 1 : 0]).el)
        return
      }

      if (key === "Home" || key === "End") {
        event.preventDefault()
        const sorted = [...all].sort((a, b) => a.top - b.top || a.left - b.left)
        mark(key === "Home" ? sorted[0].el : sorted[sorted.length - 1].el)
      }
    }

    window.addEventListener("keydown", onKeyDown)
    window.addEventListener("pointerdown", clearMarks, true)
    return () => {
      window.removeEventListener("keydown", onKeyDown)
      window.removeEventListener("pointerdown", clearMarks, true)
    }
  }, [enabled])
}
